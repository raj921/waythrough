import { v } from "convex/values";
export const status = v.union(v.literal("supported"), v.literal("arrangement_needed"), v.literal("blocked"), v.literal("unknown"));
export const kind = v.union(v.literal("arrival"), v.literal("entrance"), v.literal("route"), v.literal("destination"), v.literal("facility"));
export const step = v.object({ id: kind, label: v.string(), place: v.string(), detail: v.string(), status, quote: v.string(), condition: v.string() });
export const reply = v.object({ status: v.union(v.literal("confirmed"), v.literal("conditional"), v.literal("withdrawn"), v.literal("unclear")), summary: v.string(), condition: v.string(), stepIds: v.array(kind), quote: v.string(), matchesVisit: v.boolean() });
