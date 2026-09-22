# WayThrough research artifact

WayThrough treats an access plan as a model under pressure. A visit is a dependency graph, not a list of places: each route step can be supported, blocked, unresolved, or waiting for a dated human arrangement.

## Product hypothesis

People do not need another venue summary. They need to know which exact condition could make a visit fail, what source established it, who must answer the missing question, and what changes when that answer is withdrawn. The product therefore exposes the source quote, capture time, route status, request draft, reply interpretation, and invalidation boundary together.

## Evidence rules

1. A live analysis always covers exactly five scoped route steps.
2. Every supported or arrangement-needed claim must contain a contiguous quote from the retrieved source. Missing or fabricated quotes become `unknown`.
3. A physical blocker cannot be cleared by an email. A venue promise can satisfy only the arrangement it explicitly names and matches to the visit.
4. “May”, “subject to”, and similar language stays conditional. A withdrawal reopens the affected step.
5. Evidence is fresh for 24 hours. The scheduled freshness check invalidates source-dependent claims only when the capture timestamp still matches.
6. Share links contain the visible route only. Requirements, recipients, message bodies, raw replies, and provider credentials stay private.

## Adversarial cases

| Case | Expected behavior |
| --- | --- |
| Source becomes stale | Mark source-dependent steps unknown and ask for a recheck. |
| Source omits a requirement | Keep the step unknown; do not fill the gap from model intuition. |
| Venue reply is conditional | Keep arrangement-needed status and preserve the condition. |
| Staff arrangement is withdrawn | Reopen the smallest affected route step. |
| Reply has quoted history but no extracted new text | Store it for human review without changing the route. |
| Duplicate or out-of-order reply | Deduplicate and retain obsolete events for review. |
| Visitor challenges an interpretation | Mark that step unknown and record the review event. |

These checks are executable in `tests/plan-model.test.ts` and `tests/journeys.test.ts`.
