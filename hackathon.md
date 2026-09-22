# Hackathon log

- **Project:** WayThrough
- **Event:** Convex All Gas Hackathon
- **What it does:** Evidence-linked visit plans that retrieve venue information, expose unresolved access arrangements, and track dated venue commitments.
- **Live app:** https://colorful-marlin-799.convex.site
- **Repo:** https://github.com/raj921/waythrough
- **Frontend:** Convex static hosting
- **Convex deployment:** https://colorful-marlin-799.convex.cloud
- **Components:** @convex-dev/auth, @firecrawl/firecrawl-convex, @agentmail/convex, @convex-dev/static-hosting
- **Convex features:** schema, indexed queries, mutations, actions, scheduled functions, realtime queries, anonymous auth, HTTP webhook, static hosting
- **Auth:** Convex Auth
- **AI models:** gpt-5-mini (configurable with OPENAI_MODEL)
- **Started:** 2026-09-21T07:42:00Z
- **Last updated:** 2026-09-22T14:43:00Z

## Log

### 2026-09-22 - working tree

Replaced the earlier presentation fixture with a real Convex-backed workflow. Private browser sessions own visits; live research schedules Firecrawl retrieval and OpenAI structured extraction; source quotes are checked before status is persisted; a reviewed request is handed to AgentMail only after approval; signed inbound events are routed by sender, inbox, thread, revision, and event ID. The example is explicitly fictional and has controlled confirmation, conditional, withdrawal, stale, sharing, and revocation states (`convex/schema.ts`, `convex/convex.config.ts`, `convex/auth.ts`, `convex/journeys.ts`, `convex/pipeline.ts`, `convex/mail.ts`, `convex/http.ts`, `app/page.tsx`).

### 2026-09-22 - working tree

Added executable evidence and security checks: cross-session ownership, redacted and revocable sharing, stale-capture guards, grounded quote enforcement, blocked-route protection, conditional and withdrawn commitment handling, duplicate and out-of-order reply handling, visitor review flags, and safe recovery for a request that failed before provider handoff (`tests/plan-model.test.ts`, `tests/journeys.test.ts`).

### 2026-09-22 - working tree

Published the static frontend to the development Convex deployment at the live URL above and pushed the source to the public repository above. The hosted smoke test opened a guest session, created the fictional example, confirmed staffing, and displayed the supported route state. Provider keys are intentionally not claimed here until configured in the deployment; the Connections panel reports the live configuration state.

### 2026-09-22 - working tree

Captured a 35-second real-product walkthrough at `docs/waythrough-demo.mp4` and verified the responsive layout at desktop and mobile widths (`docs/screenshots/desktop.png`, `docs/screenshots/mobile.png`).
