import { z } from "zod";

export const kinds = [
  "arrival",
  "entrance",
  "route",
  "destination",
  "facility",
] as const;
export const statusSchema = z.enum([
  "supported",
  "arrangement_needed",
  "blocked",
  "unknown",
]);
export const stepSchema = z.object({
  id: z.enum(kinds),
  label: z.string().max(80),
  place: z.string().max(180),
  detail: z.string().max(600),
  status: statusSchema,
  quote: z.string().max(1200),
  condition: z.string().max(400),
});
export const analysisSchema = z.object({
  steps: z.array(stepSchema).length(5),
  summary: z.string().max(1500),
  subject: z.string().max(180),
  request: z.string().max(2500),
});
export const replySchema = z.object({
  status: z.enum(["confirmed", "conditional", "withdrawn", "unclear"]),
  summary: z.string().max(800),
  condition: z.string().max(600),
  stepIds: z.array(z.enum(kinds)),
  quote: z.string().max(1200),
  matchesVisit: z.boolean(),
});
export type PlanStep = z.infer<typeof stepSchema>;
export type ReplyInterpretation = z.infer<typeof replySchema>;

const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
export function groundedSteps(steps: PlanStep[], source: string): PlanStep[] {
  if (new Set(steps.map((s) => s.id)).size !== 5)
    throw new Error("Analysis must cover every route step once.");
  return kinds.map((id) => {
    const step = steps.find((s) => s.id === id)!;
    if (!step.quote || !normalize(source).includes(normalize(step.quote))) {
      return {
        ...step,
        status: "unknown",
        quote: "",
        detail: "The source does not establish this requirement.",
      };
    }
    // A physical fact with an unmet arrangement is never ready on its own.
    return step.condition && step.status === "supported"
      ? { ...step, status: "arrangement_needed" }
      : step;
  });
}
export function applyCommitment(
  steps: PlanStep[],
  reply: ReplyInterpretation,
  raw: string,
): PlanStep[] {
  const supported =
    reply.quote.length > 0 && normalize(raw).includes(normalize(reply.quote));
  return steps.map((step) => {
    if (!reply.stepIds.includes(step.id)) return step;
    // A reply cannot weaken a physical blocker or fill missing source evidence.
    if (step.status === "blocked" || step.status === "unknown") return step;
    if (!supported || !reply.matchesVisit)
      return {
        ...step,
        status: "unknown",
        condition: "Reply needs review for this visit.",
      };
    if (reply.status === "withdrawn")
      return {
        ...step,
        status: "arrangement_needed",
        condition: reply.summary,
      };
    if (
      reply.status === "conditional" ||
      (reply.status === "confirmed" && reply.condition.trim())
    )
      return {
        ...step,
        status: "arrangement_needed",
        condition: reply.condition || reply.summary,
      };
    if (reply.status === "unclear")
      return {
        ...step,
        status: "unknown",
        condition: "The latest reply needs human review.",
      };
    // Email may satisfy an arrangement; it cannot certify an unknown/blocked physical route.
    if (reply.status === "confirmed" && step.status === "arrangement_needed")
      return {
        ...step,
        status: "supported",
        condition: `Venue stated: ${reply.summary}`,
      };
    return step;
  });
}
export function overallStatus(
  steps: PlanStep[],
): "supported" | "arrangement_needed" | "blocked" | "unknown" {
  if (steps.some((s) => s.status === "blocked")) return "blocked";
  if (steps.some((s) => s.status === "unknown")) return "unknown";
  if (steps.some((s) => s.status === "arrangement_needed"))
    return "arrangement_needed";
  return "supported";
}
export function publicHttpsUrl(input: string) {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !host.includes(".") ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(host) ||
    /^[\d.]+$/.test(host) ||
    host.includes(":")
  )
    throw new Error("Use a public HTTPS venue page.");
  return url.href;
}
export function validateVisitDate(value: string) {
  const date = new Date(value);
  if (
    !Number.isFinite(date.valueOf()) ||
    date.valueOf() <= Date.now() ||
    date.valueOf() > Date.now() + 366 * 86400000
  ) {
    throw new Error("Choose a future visit within the next year.");
  }
  return date.toISOString();
}
