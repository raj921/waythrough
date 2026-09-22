import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { AgentMail, type OutboundId } from "@agentmail/convex";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { step, reply } from "./validators";
import {
  applyCommitment,
  kinds,
  publicHttpsUrl,
  validateVisitDate,
  type PlanStep,
} from "../lib/plan-model";

export async function owned(ctx: QueryCtx | MutationCtx, id: Id<"journeys">) {
  const user = await getAuthUserId(ctx);
  const journey = await ctx.db.get(id);
  if (!user || !journey || journey.ownerId !== user)
    throw new ConvexError("This visit belongs to a different session.");
  return journey;
}
async function quota(ctx: MutationCtx, bucket: string, max: number) {
  const key = `${bucket}:${new Date().toISOString().slice(0, 10)}`;
  const row = await ctx.db
    .query("usage")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if ((row?.count ?? 0) >= max)
    throw new ConvexError(
      "Today's demo usage limit is reached. Please try again tomorrow.",
    );
  if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
  else await ctx.db.insert("usage", { key, count: 1 });
}
export const list = query({
  args: {},
  returns: v.array(schema.doc("journeys")),
  handler: async (ctx) => {
    const user = await getAuthUserId(ctx);
    return user
      ? await ctx.db
          .query("journeys")
          .withIndex("by_ownerId", (q) => q.eq("ownerId", user))
          .order("desc")
          .take(30)
      : [];
  },
});
export const detail = query({
  args: { id: v.id("journeys") },
  handler: async (ctx, { id }) => {
    const journey = await owned(ctx, id);
    const observations = await ctx.db
      .query("observations")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", id))
      .order("desc")
      .take(10);
    const events = await ctx.db
      .query("journeyEvents")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", id))
      .order("desc")
      .take(40);
    const delivery = journey.outboundId
      ? await new AgentMail(components.agentmail).status(
          ctx,
          journey.outboundId as OutboundId,
        )
      : null;
    return { journey, observations, events, delivery };
  },
});
export const providers = query({
  args: {},
  returns: v.object({
    firecrawl: v.boolean(),
    openai: v.boolean(),
    agentmail: v.boolean(),
    webhook: v.boolean(),
  }),
  handler: () => ({
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    agentmail: Boolean(process.env.AGENTMAIL_API_KEY),
    webhook: Boolean(process.env.AGENTMAIL_WEBHOOK_SECRET),
  }),
});

export const create = mutation({
  args: {
    venue: v.string(),
    url: v.string(),
    visitAt: v.string(),
    needs: v.string(),
  },
  returns: v.id("journeys"),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new ConvexError("Start a private session first.");
    if (
      !args.venue.trim() ||
      args.venue.length > 160 ||
      args.needs.trim().length < 5 ||
      args.needs.length > 2000
    )
      throw new ConvexError(
        "Enter a venue and practical access requirements (up to 2,000 characters).",
      );
    const url = publicHttpsUrl(args.url);
    const visitAt = validateVisitDate(args.visitAt);
    await quota(ctx, `create:${ownerId}`, 10);
    return await ctx.db.insert("journeys", {
      ...args,
      url,
      visitAt,
      ownerId,
      mode: "live",
      phase: "idle",
      steps: [],
      summary: "Ready to research the venue page.",
      subject: "",
      request: "",
      recipient: "",
      revision: 0,
      requestState: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const startResearch = mutation({
  args: { id: v.id("journeys") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const j = await owned(ctx, id);
    if (j.mode !== "live")
      throw new ConvexError(
        "The example uses a labeled fixture. Create a visit to research a live page.",
      );
    if (!process.env.FIRECRAWL_API_KEY || !process.env.OPENAI_API_KEY)
      throw new ConvexError(
        "Live research needs Firecrawl and OpenAI credentials. Open Connections for setup status.",
      );
    if (j.phase === "researching" && Date.now() - (j.lastAttempt ?? 0) < 180000)
      return null;
    if (Date.now() - (j.lastAttempt ?? 0) < 60000)
      throw new ConvexError("Wait one minute before another source check.");
    await quota(ctx, `research:${j.ownerId}`, 8);
    await quota(ctx, "research:global", 80);
    const revision = j.revision + 1;
    await ctx.db.patch(id, {
      phase: "researching",
      revision,
      lastAttempt: Date.now(),
      error: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.research, {
      id,
      revision,
    });
    return null;
  },
});
export const getInternal = internalQuery({
  args: { id: v.id("journeys") },
  returns: v.union(schema.doc("journeys"), v.null()),
  handler: (ctx, { id }) => ctx.db.get(id),
});
export const saveResearch = internalMutation({
  args: {
    id: v.id("journeys"),
    revision: v.number(),
    steps: v.array(step),
    summary: v.string(),
    subject: v.string(),
    request: v.string(),
    text: v.string(),
    hash: v.string(),
    model: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const j = await ctx.db.get(args.id);
    if (!j || j.revision !== args.revision) return null;
    const changed = Boolean(j.sourceHash && j.sourceHash !== args.hash);
    const now = Date.now();
    // Every source analysis starts from source facts; email never silently survives a source change.
    await ctx.db.patch(j._id, {
      steps: args.steps,
      summary: args.summary,
      ...(j.requestState === "draft"
        ? { subject: args.subject, request: args.request }
        : {}),
      sourceHash: args.hash,
      phase: "ready",
      lastChecked: now,
      updatedAt: now,
      commitment: undefined,
      commitmentUntil: undefined,
      error: undefined,
    });
    await ctx.db.insert("observations", {
      journeyId: j._id,
      source: j.url,
      text: args.text,
      hash: args.hash,
      capturedAt: now,
      provider: "Firecrawl",
    });
    await ctx.db.insert("journeyEvents", {
      journeyId: j._id,
      eventKey: `research:${j._id}:${args.revision}`,
      label: changed
        ? "Source changed · arrangements need review"
        : "Source captured and interpreted",
      detail: `Firecrawl retrieved the page. ${args.model} extracted scoped claims; exact quotes were checked. Previous commitments require review after a source check.`,
      at: now,
      provider: "Firecrawl + OpenAI",
    });
    await ctx.scheduler.runAfter(24 * 3600000, internal.journeys.markStale, {
      id: j._id,
      capturedAt: now,
    });
    return null;
  },
});
export const fail = internalMutation({
  args: { id: v.id("journeys"), revision: v.number(), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const j = await ctx.db.get(args.id);
    if (j?.revision === args.revision)
      await ctx.db.patch(args.id, {
        phase: "failed",
        error: args.error,
        updatedAt: Date.now(),
      });
    return null;
  },
});

export const saveDraft = mutation({
  args: {
    id: v.id("journeys"),
    recipient: v.string(),
    subject: v.string(),
    request: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const j = await owned(ctx, args.id);
    if (j.requestState !== "draft")
      throw new ConvexError("A queued or sent request cannot be edited.");
    if (
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(args.recipient) ||
      args.recipient.length > 254
    )
      throw new ConvexError("Enter one valid venue email address.");
    if (
      !args.subject.trim() ||
      args.subject.length > 180 ||
      /[\r\n]/.test(args.subject) ||
      !args.request.trim() ||
      args.request.length > 3000
    )
      throw new ConvexError(
        "Provide a subject and a focused request under 3,000 characters.",
      );
    await ctx.db.patch(j._id, {
      recipient: args.recipient.trim().toLowerCase(),
      subject: args.subject.trim(),
      request: args.request.trim(),
      updatedAt: Date.now(),
    });
    return null;
  },
});
export const approveAndSend = mutation({
  args: {
    id: v.id("journeys"),
    subject: v.string(),
    request: v.string(),
    recipient: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const j = await owned(ctx, args.id);
    if (j.mode !== "live")
      throw new ConvexError("Example messages are never sent.");
    if (j.requestState !== "draft") return null; // Repeat clicks cannot queue duplicate mail.
    if (j.phase !== "ready" || j.visitAt <= new Date().toISOString())
      throw new ConvexError("Research a future visit before sending.");
    if (!process.env.AGENTMAIL_API_KEY || !process.env.AGENTMAIL_WEBHOOK_SECRET)
      throw new ConvexError(
        "Email needs AgentMail and its signed webhook configured.",
      );
    if (
      !j.recipient ||
      args.recipient !== j.recipient ||
      args.subject !== j.subject ||
      args.request !== j.request
    )
      throw new ConvexError(
        "The draft changed. Review the latest recipient and message again.",
      );
    await quota(ctx, `send:${j.ownerId}`, 2);
    await quota(ctx, "send:global", 15);
    await ctx.db.patch(j._id, {
      requestState: "queued",
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.prepareInbox, {
      id: j._id,
    });
    return null;
  },
});
export const queueMail = internalMutation({
  args: { id: v.id("journeys"), inboxId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const j = await ctx.db.get(args.id);
    if (!j || j.outboundId || j.requestState !== "queued") return null;
    const mail = new AgentMail(components.agentmail, {
      onMessageReceived: internal.mail.received,
    });
    const outboundId = await mail.sendMessage(ctx, args.inboxId, {
      to: j.recipient,
      subject: j.subject,
      text: j.request,
      labels: ["waythrough"],
    });
    await ctx.db.patch(j._id, {
      inboxId: args.inboxId,
      outboundId,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("journeyEvents", {
      journeyId: j._id,
      eventKey: `send:${outboundId}`,
      label: "Approved request queued",
      detail:
        "The reviewed recipient and text were handed to AgentMail. Delivery status is tracked separately.",
      at: Date.now(),
      provider: "AgentMail",
    });
    return null;
  },
});
export const failMail = internalMutation({
  args: { id: v.id("journeys"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      requestState: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const acceptReply = internalMutation({
  args: {
    id: v.id("journeys"),
    eventId: v.string(),
    raw: v.string(),
    interpretation: reply,
    revision: v.number(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("journeyEvents")
      .withIndex("by_eventKey", (q) => q.eq("eventKey", args.eventId))
      .unique();
    if (existing) return null;
    const j = await ctx.db.get(args.id);
    if (!j) return null;
    const newer = await ctx.db
      .query("journeyEvents")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", j._id))
      .order("desc")
      .take(40);
    const obsolete =
      j.revision !== args.revision ||
      newer.some((e) => e.interpretation && e.at > args.timestamp);
    await ctx.db.insert("journeyEvents", {
      journeyId: j._id,
      eventKey: args.eventId,
      raw: args.raw,
      interpretation: args.interpretation,
      label: obsolete
        ? "Reply retained for review"
        : `Venue reply · ${args.interpretation.status}`,
      detail: args.interpretation.summary,
      at: args.timestamp,
      provider: "AgentMail + OpenAI",
    });
    if (!obsolete) {
      const until = new Date(j.visitAt).valueOf() + 2 * 3600000;
      const steps = applyCommitment(j.steps, args.interpretation, args.raw);
      await ctx.db.patch(j._id, {
        steps,
        commitment: args.interpretation,
        commitmentUntil: until,
        requestState: "replied",
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAt(
        Math.max(until, Date.now()),
        internal.journeys.expire,
        { id: j._id, until },
      );
    }
    return null;
  },
});
export const expire = internalMutation({
  args: { id: v.id("journeys"), until: v.number() },
  returns: v.null(),
  handler: async (ctx, { id, until }) => {
    const j = await ctx.db.get(id);
    if (
      !j ||
      j.commitmentUntil !== until ||
      !j.commitment ||
      until > Date.now()
    )
      return null;
    const ids = j.commitment.stepIds;
    await ctx.db.patch(id, {
      steps: j.steps.map((s) =>
        ids.includes(s.id)
          ? {
              ...s,
              status: "unknown" as const,
              condition: "The dated arrangement has expired.",
            }
          : s,
      ),
      commitment: undefined,
      commitmentUntil: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("journeyEvents", {
      journeyId: id,
      eventKey: `expiry:${id}:${until}`,
      label: "Arrangement expired",
      detail: "Dependent steps need a new dated confirmation.",
      at: Date.now(),
      provider: "Convex scheduler",
    });
    return null;
  },
});
export const markStale = internalMutation({
  args: { id: v.id("journeys"), capturedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { id, capturedAt }) => {
    const j = await ctx.db.get(id);
    if (!j || j.lastChecked !== capturedAt) return null;
    await ctx.db.patch(id, {
      steps: j.steps.map((s) => ({
        ...s,
        status: "unknown" as const,
        condition:
          "Source evidence is over 24 hours old. Recheck before relying on it.",
      })),
      commitment: undefined,
      commitmentUntil: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("journeyEvents", {
      journeyId: id,
      eventKey: `stale:${id}:${capturedAt}`,
      label: "Evidence needs a freshness check",
      detail:
        "The 24-hour evidence window ended. All source-dependent steps need review.",
      at: Date.now(),
      provider: "Convex scheduler",
    });
    return null;
  },
});
export const flagStep = mutation({
  args: { id: v.id("journeys"), stepId: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, stepId }) => {
    const j = await owned(ctx, id);
    if (!j.steps.some((s) => s.id === stepId))
      throw new ConvexError("This step is not in the visit.");
    await ctx.db.patch(id, {
      steps: j.steps.map((s) =>
        s.id === stepId && s.status !== "blocked"
          ? {
              ...s,
              status: "unknown" as const,
              condition:
                "The visitor flagged this interpretation for review. Recheck the evidence.",
            }
          : s,
      ),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("journeyEvents", {
      journeyId: id,
      eventKey: crypto.randomUUID(),
      label: "Visitor challenged an interpretation",
      detail: `${stepId} requires a fresh evidence review.`,
      at: Date.now(),
      provider: "Visitor review",
    });
    return null;
  },
});
export const reopenUnsentDraft = mutation({
  args: { id: v.id("journeys") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const j = await owned(ctx, id);
    if (j.requestState !== "failed" || j.outboundId)
      throw new ConvexError(
        "A request already handed to the provider cannot be resent here.",
      );
    await ctx.db.patch(id, { requestState: "draft", error: undefined });
    return null;
  },
});
export const share = mutation({
  args: { id: v.id("journeys"), enabled: v.boolean() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { id, enabled }) => {
    const j = await owned(ctx, id);
    const token = enabled
      ? (j.shareToken ?? crypto.randomUUID() + crypto.randomUUID())
      : undefined;
    await ctx.db.patch(id, { shareToken: token });
    return token ?? null;
  },
});
export const shared = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length !== 72) return null;
    const j = await ctx.db
      .query("journeys")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", token))
      .unique();
    // Share only the visible route. Private requirements and email bodies stay private.
    return j
      ? {
          venue: j.venue,
          visitAt: j.visitAt,
          steps: j.steps,
          mode: j.mode,
          updatedAt: j.updatedAt,
        }
      : null;
  },
});

export const example = mutation({
  args: {},
  returns: v.id("journeys"),
  handler: async (ctx) => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new ConvexError("Start a private session first.");
    await quota(ctx, `create:${ownerId}`, 10);
    const labels = [
      "Arrival",
      "Entrance",
      "Internal route",
      "Exhibition",
      "Facilities",
    ];
    const details = [
      "Level path from the drop-off to the side entrance.",
      "Side entrance must be opened by a staff member.",
      "Ground-floor route to the East gallery avoids the lift.",
      "East gallery is on the ground floor.",
      "Accessible toilet is on the ground-floor route.",
    ];
    const steps: PlanStep[] = kinds.map((id, i) => ({
      id,
      label: labels[i],
      place: [
        "Drop-off",
        "Side ramp door",
        "Ground-floor corridor",
        "East gallery",
        "Accessible toilet",
      ][i],
      detail: details[i],
      status: id === "entrance" ? "arrangement_needed" : "supported",
      quote: details[i],
      condition:
        id === "entrance" ? "Confirm a staff handoff for the visit time." : "",
    }));
    const now = Date.now();
    const visitAt = new Date(now + 7 * 86400000).toISOString();
    const id = await ctx.db.insert("journeys", {
      ownerId,
      venue: "Riverside Gallery · example",
      url: "https://example.org",
      visitAt,
      needs: "Step-free access to the exhibition and an accessible toilet.",
      mode: "example",
      phase: "ready",
      steps,
      summary:
        "One human arrangement completes this fictional visit. Try a confirmation, then a withdrawal, and watch the route change.",
      subject: "Step-free side entrance arrangement",
      request:
        "Could a staff member meet us at the side entrance at the planned visit time and open the door?",
      recipient: "",
      revision: 0,
      requestState: "draft",
      lastChecked: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("observations", {
      journeyId: id,
      source: "Fictional evaluation fixture",
      text: details.join("\n"),
      hash: "example-v1",
      capturedAt: now,
      provider: "Example fixture · no live retrieval",
    });
    return id;
  },
});
export const scenario = mutation({
  args: {
    id: v.id("journeys"),
    scenario: v.union(
      v.literal("confirmed"),
      v.literal("conditional"),
      v.literal("withdrawn"),
      v.literal("stale"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const j = await owned(ctx, args.id);
    if (j.mode !== "example")
      throw new ConvexError(
        "Controlled scenarios only apply to example visits.",
      );
    const raw = {
      confirmed:
        "A staff member will open the side entrance at your planned visit time.",
      conditional:
        "We may be able to staff the entrance, subject to availability.",
      withdrawn:
        "We can no longer provide staff at the side entrance for your visit.",
      stale: "The source has not been rechecked within its freshness window.",
    }[args.scenario];
    const interpretation = {
      status: args.scenario === "stale" ? ("unclear" as const) : args.scenario,
      summary: raw,
      condition:
        args.scenario === "conditional" ? "Subject to staff availability" : "",
      stepIds: ["entrance" as const],
      quote: raw,
      matchesVisit: true,
    };
    const steps =
      args.scenario === "stale"
        ? j.steps.map((s) => ({
            ...s,
            status: "unknown" as const,
            condition:
              "Evidence is stale. Recheck before relying on this step.",
          }))
        : applyCommitment(j.steps, interpretation, raw);
    await ctx.db.patch(j._id, {
      steps,
      commitment: interpretation,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("journeyEvents", {
      journeyId: j._id,
      eventKey: crypto.randomUUID(),
      label: `Controlled scenario · ${args.scenario}`,
      detail: raw,
      raw,
      interpretation,
      at: Date.now(),
      provider: "Example fixture · no email sent",
    });
    return null;
  },
});
