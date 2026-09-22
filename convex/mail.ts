import { v } from "convex/values";
import { z } from "zod";
import { AgentMail, type OutboundId } from "@agentmail/convex";
import { internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";

const messageSchema = z.object({
  inbox_id: z.string(),
  message_id: z.string(),
  thread_id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  extracted_text: z.string().optional(),
  text: z.string().optional(),
});
export const received = internalMutation({
  args: { message: v.any(), thread: v.any(), eventId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // The public entry point is the component's signature-verified webhook, never this callback.
    const parsed = messageSchema.safeParse(args.message);
    if (!parsed.success) return null;
    const m = parsed.data;
    const j = await ctx.db
      .query("journeys")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", m.inbox_id))
      .unique();
    if (!j || !j.outboundId) return null;
    const sender = (m.from.match(/<([^>]+)>/)?.[1] ?? m.from)
      .trim()
      .toLowerCase();
    const delivery = await new AgentMail(components.agentmail).status(
      ctx,
      j.outboundId as OutboundId,
    );
    if (
      sender !== j.recipient ||
      !delivery?.threadId ||
      m.thread_id !== delivery.threadId
    )
      return null;
    const timestamp = new Date(m.timestamp).valueOf();
    if (!Number.isFinite(timestamp)) return null;
    // Missing extraction is a review case: quoted history must never reconfirm a promise.
    const raw = (m.extracted_text || m.text || "").slice(0, 12000);
    if (!raw.trim()) return null;
    const eventId = `message:${m.message_id}`;
    const existing = await ctx.db
      .query("journeyEvents")
      .withIndex("by_eventKey", (q) => q.eq("eventKey", eventId))
      .unique();
    if (existing) return null;
    await ctx.db.patch(j._id, { threadId: m.thread_id });
    if (!m.extracted_text?.trim()) {
      await ctx.runMutation(internal.journeys.acceptReply, {
        id: j._id,
        eventId,
        raw,
        timestamp,
        revision: j.revision,
        interpretation: {
          status: "unclear",
          summary:
            "Reply received without a reliable separation from quoted history. Inspect the original text.",
          condition: "Human review required",
          quote: "",
          matchesVisit: false,
          stepIds: [
            ...new Set([
              ...(j.commitment?.stepIds ?? []),
              ...j.steps
                .filter((s) => s.status === "arrangement_needed")
                .map((s) => s.id),
            ]),
          ],
        },
      });
      return null;
    }
    await ctx.scheduler.runAfter(0, internal.pipeline.interpretReply, {
      id: j._id,
      eventId,
      raw,
      timestamp,
    });
    return null;
  },
});
