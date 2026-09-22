import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { step, reply } from "./validators";

const stepStatus = v.union(
  v.literal("supported"),
  v.literal("arrangement_needed"),
  v.literal("blocked"),
  v.literal("unknown"),
);

export default defineSchema({
  ...authTables,
  journeys: defineTable({
    ownerId: v.id("users"), venue: v.string(), url: v.string(), visitAt: v.string(), needs: v.string(),
    mode: v.union(v.literal("example"), v.literal("live")),
    phase: v.union(v.literal("idle"), v.literal("researching"), v.literal("ready"), v.literal("failed")),
    steps: v.array(step), summary: v.string(), subject: v.string(), request: v.string(),
    recipient: v.string(), revision: v.number(),
    requestState: v.union(v.literal("draft"), v.literal("queued"), v.literal("sent"), v.literal("replied"), v.literal("failed")),
    outboundId: v.optional(v.string()), inboxId: v.optional(v.string()), threadId: v.optional(v.string()),
    lastChecked: v.optional(v.number()), lastAttempt: v.optional(v.number()), sourceHash: v.optional(v.string()),
    error: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
    shareToken: v.optional(v.string()), commitment: v.optional(reply), commitmentUntil: v.optional(v.number()),
  }).index("by_ownerId", ["ownerId"]).index("by_inboxId", ["inboxId"]).index("by_shareToken", ["shareToken"]),
  observations: defineTable({ journeyId: v.id("journeys"), source: v.string(), text: v.string(), hash: v.string(), capturedAt: v.number(), provider: v.string() }).index("by_journeyId", ["journeyId"]),
  journeyEvents: defineTable({ journeyId: v.id("journeys"), eventKey: v.string(), label: v.string(), detail: v.string(), at: v.number(), raw: v.optional(v.string()), provider: v.string(), interpretation: v.optional(reply) }).index("by_journeyId", ["journeyId"]).index("by_eventKey", ["eventKey"]),
  usage: defineTable({ key: v.string(), count: v.number() }).index("by_key", ["key"]),
  visitPlans: defineTable({
    slug: v.string(),
    venueName: v.string(),
    venueLocation: v.string(),
    dateLabel: v.string(),
    timeLabel: v.string(),
    visitorSummary: v.string(),
    status: stepStatus,
    syncLabel: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  visitSteps: defineTable({
    planId: v.id("visitPlans"),
    stepId: v.string(),
    order: v.number(),
    kind: v.union(
      v.literal("arrival"),
      v.literal("entrance"),
      v.literal("route"),
      v.literal("destination"),
      v.literal("facility"),
    ),
    label: v.string(),
    place: v.string(),
    detail: v.string(),
    status: stepStatus,
    evidenceCount: v.number(),
    dependency: v.optional(v.string()),
  }).index("by_plan_order", ["planId", "order"]),

  evidenceItems: defineTable({
    planId: v.id("visitPlans"),
    evidenceId: v.string(),
    kind: v.union(v.literal("official"), v.literal("message"), v.literal("guide")),
    title: v.string(),
    source: v.string(),
    excerpt: v.string(),
    url: v.optional(v.string()),
    capturedAt: v.string(),
    confidence: v.number(),
    affectsStep: v.string(),
  }).index("by_plan", ["planId"]),

  visitRequests: defineTable({
    planId: v.id("visitPlans"),
    requestId: v.string(),
    subject: v.string(),
    body: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("sent"), v.literal("replied")),
    recipientLabel: v.string(),
    approvedAt: v.optional(v.number()),
  }).index("by_plan", ["planId"]),

  commitments: defineTable({
    planId: v.id("visitPlans"),
    commitmentId: v.string(),
    title: v.string(),
    condition: v.string(),
    owner: v.string(),
    location: v.string(),
    timeWindow: v.string(),
    status: v.union(v.literal("confirmed"), v.literal("conditional"), v.literal("withdrawn")),
    validUntil: v.string(),
    sourceLabel: v.string(),
  }).index("by_plan", ["planId"]),

  activityEvents: defineTable({
    planId: v.id("visitPlans"),
    eventId: v.string(),
    label: v.string(),
    detail: v.string(),
    at: v.string(),
    tone: v.union(v.literal("neutral"), v.literal("warning"), v.literal("success")),
  }).index("by_plan", ["planId"]),
});
