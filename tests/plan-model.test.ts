import { describe, expect, test } from "vitest";
import {
  applyCommitment,
  groundedSteps,
  overallStatus,
  publicHttpsUrl,
  type PlanStep,
  type ReplyInterpretation,
  kinds,
} from "../lib/plan-model";
const steps: PlanStep[] = kinds.map((id) => ({
  id,
  label: id,
  place: "Test gallery",
  detail: "A level path exists.",
  quote: "A level path exists.",
  status: id === "entrance" ? "arrangement_needed" : "supported",
  condition: "",
}));
const reply: ReplyInterpretation = {
  status: "confirmed",
  summary: "Staff will meet you.",
  quote: "Staff will meet you.",
  condition: "",
  stepIds: ["entrance"],
  matchesVisit: true,
};
describe("evidence model under pressure", () => {
  test("unsupported source quotes cannot produce a supported route", () => {
    expect(
      groundedSteps(steps, "There is no route description.").every(
        (s) => s.status === "unknown",
      ),
    ).toBe(true);
  });
  test("normalizes whitespace without inventing evidence", () => {
    expect(groundedSteps(steps, "A level\npath exists.")[0].status).toBe(
      "supported",
    );
  });
  test("a conditional physical statement remains unresolved", () => {
    const conditioned = steps.map((s) => ({ ...s, condition: "Staff needed" }));
    expect(groundedSteps(conditioned, "A level path exists.")[0].status).toBe(
      "arrangement_needed",
    );
  });
  test("confirmation satisfies only the scoped arrangement", () => {
    const resolved = applyCommitment(steps, reply, reply.quote);
    expect(resolved[1].status).toBe("supported");
    expect(resolved[0]).toEqual(steps[0]);
    expect(overallStatus(resolved)).toBe("supported");
  });
  test("withdrawal invalidates an earlier confirmation", () => {
    const resolved = applyCommitment(steps, reply, reply.quote);
    const withdrawn = applyCommitment(
      resolved,
      { ...reply, status: "withdrawn" },
      reply.quote,
    );
    expect(withdrawn[1].status).toBe("arrangement_needed");
    expect(withdrawn[0]).toEqual(steps[0]);
  });
  test("conditional, wrong-date, unclear and fabricated replies never confirm", () => {
    expect(
      applyCommitment(
        steps,
        { ...reply, status: "conditional" },
        reply.quote,
      )[1].status,
    ).toBe("arrangement_needed");
    expect(
      applyCommitment(steps, { ...reply, matchesVisit: false }, reply.quote)[1]
        .status,
    ).toBe("unknown");
    expect(
      applyCommitment(steps, { ...reply, status: "unclear" }, reply.quote)[1]
        .status,
    ).toBe("unknown");
    expect(applyCommitment(steps, reply, "Unrelated text")[1].status).toBe(
      "unknown",
    );
  });
  test("an email cannot certify an explicitly blocked route", () => {
    expect(
      applyCommitment(
        steps.map((s) => ({ ...s, status: "blocked" })),
        reply,
        reply.quote,
      )[1].status,
    ).toBe("blocked");
  });
  test("duplicate or missing steps fail the representation check", () => {
    expect(() =>
      groundedSteps([...steps.slice(0, 4), steps[0]], "A level path exists."),
    ).toThrow();
  });
  test.each([
    "http://example.com",
    "https://127.0.0.1",
    "https://localhost",
    "https://10.0.0.1",
    "https://example.internal",
    "https://user:pass@example.com",
    "https://[::1]",
  ])("rejects unsafe source %s", (url) =>
    expect(() => publicHttpsUrl(url)).toThrow(),
  );
});

test("a hidden condition cannot be promoted by a confirmed label", () => {
  const steps: PlanStep[] = kinds.map((id) => ({
    id,
    label: id,
    place: "Door",
    detail: "Staffed door",
    quote: "Staffed door",
    condition: "",
    status: "arrangement_needed",
  }));
  const reply: ReplyInterpretation = {
    status: "confirmed",
    summary: "Staff may meet you",
    condition: "Subject to availability",
    stepIds: ["entrance"],
    quote: "Staff may meet you",
    matchesVisit: true,
  };
  expect(applyCommitment(steps, reply, reply.quote)[1].status).toBe(
    "arrangement_needed",
  );
  for (const status of ["conditional", "withdrawn", "unclear"] as const) {
    const blocked = steps.map((s) => ({ ...s, status: "blocked" as const }));
    expect(
      applyCommitment(blocked, { ...reply, status }, reply.quote)[1].status,
    ).toBe("blocked");
  }
});
