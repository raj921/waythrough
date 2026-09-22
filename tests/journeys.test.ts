/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
async function session() {
  const t = convexTest(schema, modules);
  const user = await t.run((ctx) =>
    ctx.db.insert("users", { isAnonymous: true }),
  );
  return { t, owner: t.withIdentity({ subject: `${user}|session` }) };
}
test("private visits reject anonymous and other-user reads and writes", async () => {
  const { t, owner } = await session();
  const id = await owner.mutation(api.journeys.example, {});
  await expect(t.query(api.journeys.detail, { id })).rejects.toThrow();
  const stranger = await t.run((ctx) =>
    ctx.db.insert("users", { isAnonymous: true }),
  );
  const other = t.withIdentity({ subject: `${stranger}|other` });
  expect(await other.query(api.journeys.list, {})).toEqual([]);
  await expect(other.query(api.journeys.detail, { id })).rejects.toThrow();
  await expect(
    other.mutation(api.journeys.share, { id, enabled: true }),
  ).rejects.toThrow();
  await expect(
    other.mutation(api.journeys.scenario, { id, scenario: "confirmed" }),
  ).rejects.toThrow();
});
test("share link is read-only, redacted and revocable", async () => {
  const { t, owner } = await session();
  const id = await owner.mutation(api.journeys.example, {});
  const token = await owner.mutation(api.journeys.share, { id, enabled: true });
  expect(token).toBeTruthy();
  const shared = await t.query(api.journeys.shared, { token: token! });
  expect(shared).not.toHaveProperty("needs");
  expect(shared).not.toHaveProperty("recipient");
  expect(shared).not.toHaveProperty("request");
  await owner.mutation(api.journeys.share, { id, enabled: false });
  expect(await t.query(api.journeys.shared, { token: token! })).toBeNull();
});
test("example confirmation and withdrawal persist, but cannot send real email", async () => {
  const { t, owner } = await session();
  const id = await owner.mutation(api.journeys.example, {});
  await owner.mutation(api.journeys.scenario, { id, scenario: "confirmed" });
  expect((await t.run((ctx) => ctx.db.get(id)))?.steps[1].status).toBe(
    "supported",
  );
  await owner.mutation(api.journeys.scenario, { id, scenario: "withdrawn" });
  expect((await t.run((ctx) => ctx.db.get(id)))?.steps[1].status).toBe(
    "arrangement_needed",
  );
  await expect(
    owner.mutation(api.journeys.approveAndSend, {
      id,
      subject: "x",
      request: "x",
      recipient: "x@example.com",
    }),
  ).rejects.toThrow("Example messages");
});
test("a stale task cannot invalidate a newer capture", async () => {
  const { t, owner } = await session();
  const id = await owner.mutation(api.journeys.example, {});
  const j = await t.run((ctx) => ctx.db.get(id));
  await t.mutation(internal.journeys.markStale, { id, capturedAt: 0 });
  expect((await t.run((ctx) => ctx.db.get(id)))?.steps[0].status).toBe(
    "supported",
  );
  await t.mutation(internal.journeys.markStale, {
    id,
    capturedAt: j!.lastChecked!,
  });
  expect(
    (await t.run((ctx) => ctx.db.get(id)))?.steps.every(
      (s) => s.status === "unknown",
    ),
  ).toBe(true);
});
test("missing credentials leave research idle and preserve prior evidence", async () => {
  const { owner } = await session();
  const id = await owner.mutation(api.journeys.create, {
    venue: "Test",
    url: "https://example.org",
    visitAt: new Date(Date.now() + 86400000).toISOString(),
    needs: "Step-free entrance",
  });
  await expect(
    owner.mutation(api.journeys.startResearch, { id }),
  ).rejects.toThrow("credentials");
  expect((await owner.query(api.journeys.detail, { id })).journey.phase).toBe(
    "idle",
  );
});

test("duplicate and out-of-order replies cannot restore withdrawn staffing", async () => {
  const { t, owner } = await session();
  const id = await owner.mutation(api.journeys.example, {});
  const interpretation = {
    status: "confirmed" as const,
    summary: "Staff will meet you.",
    condition: "",
    stepIds: ["entrance" as const],
    quote: "Staff will meet you.",
    matchesVisit: true,
  };
  const now = Date.now();
  await t.mutation(internal.journeys.acceptReply, {
    id,
    eventId: "reply-a",
    raw: interpretation.quote,
    interpretation,
    revision: 0,
    timestamp: now,
  });
  await t.mutation(internal.journeys.acceptReply, {
    id,
    eventId: "reply-b",
    raw: "Staff unavailable.",
    interpretation: {
      ...interpretation,
      status: "withdrawn",
      summary: "Staff unavailable.",
      quote: "Staff unavailable.",
    },
    revision: 0,
    timestamp: now + 100,
  });
  await t.mutation(internal.journeys.acceptReply, {
    id,
    eventId: "reply-a",
    raw: interpretation.quote,
    interpretation,
    revision: 0,
    timestamp: now,
  });
  await t.mutation(internal.journeys.acceptReply, {
    id,
    eventId: "reply-c",
    raw: interpretation.quote,
    interpretation,
    revision: 0,
    timestamp: now + 50,
  });
  const j = await t.run((ctx) => ctx.db.get(id));
  expect(j?.steps[1].status).toBe("arrangement_needed");
  const events = await t.run((ctx) => ctx.db.query("journeyEvents").collect());
  expect(events).toHaveLength(3);
  expect(events.find((e) => e.eventKey === "reply-c")?.label).toBe(
    "Reply retained for review",
  );
});

test("a visitor challenge persists and cannot remove a physical blocker", async () => {
  const { t, owner } = await session();
  const id = await owner.mutation(api.journeys.example, {});
  await owner.mutation(api.journeys.flagStep, { id, stepId: "arrival" });
  expect((await t.run((ctx) => ctx.db.get(id)))?.steps[0].status).toBe(
    "unknown",
  );
  await expect(
    owner.mutation(api.journeys.flagStep, { id, stepId: "invented" }),
  ).rejects.toThrow();
});

test("only a failed request never handed to AgentMail may be reopened", async () => {
  const { t, owner } = await session();
  const id = await owner.mutation(api.journeys.example, {});
  await t.run((ctx) => ctx.db.patch(id, { requestState: "failed" }));
  await owner.mutation(api.journeys.reopenUnsentDraft, { id });
  expect((await t.run((ctx) => ctx.db.get(id)))?.requestState).toBe("draft");
  await t.run((ctx) =>
    ctx.db.patch(id, { requestState: "failed", outboundId: "already-queued" }),
  );
  await expect(
    owner.mutation(api.journeys.reopenUnsentDraft, { id }),
  ).rejects.toThrow("cannot be resent");
});
