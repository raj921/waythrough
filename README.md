# WayThrough

WayThrough turns a venue visit into an evidence-linked access plan. It keeps five route dependencies visible — arrival, entrance, internal route, destination, and facilities — then asks a human for only the unresolved arrangement. A source can go stale, a venue can reply conditionally, and a withdrawal can reopen the smallest affected step.

Live app: https://colorful-marlin-799.convex.site  ·  Source: https://github.com/raj921/waythrough

## What is real

- Convex owns the schema, realtime queries, auth, mutations, scheduled freshness checks, and provider orchestration.
- Convex Auth creates a private anonymous browser session. No email is required to try the app.
- Firecrawl retrieves the supplied public venue page when `FIRECRAWL_API_KEY` is configured.
- OpenAI extracts a strict five-step evidence model and interprets inbound venue replies when `OPENAI_API_KEY` is configured. The default model is `gpt-5-mini`; set `OPENAI_MODEL` to override it.
- AgentMail creates a dedicated inbox, sends only after an explicit review action, verifies the signed webhook, and routes replies by sender and thread.
- Static Hosting publishes the Next.js export beside the Convex backend at `*.convex.site`.

The interactive example is deliberately fictional. It exercises confirmation, conditional staffing, withdrawal, stale evidence, sharing, and revocation without sending email or pretending to have crawled a page.

## Run locally

```bash
pnpm install
npx convex dev
npm run dev
```

Copy `.env.example` to `.env.local` only for local frontend configuration. Provider secrets belong in the Convex deployment environment, never in the browser bundle or Git. Use the Convex dashboard for `OPENAI_API_KEY`, `FIRECRAWL_API_KEY`, `AGENTMAIL_API_KEY`, and `AGENTMAIL_WEBHOOK_SECRET`.

The signed AgentMail endpoint is:

```text
https://colorful-marlin-799.convex.site/agentmail/webhook
```

Create a webhook for `message.received` in AgentMail, then store the returned secret in the Convex deployment. The app ignores mismatched senders, threads, revisions, duplicate event IDs, and replies without reliable extracted text.

## Verify and deploy

```bash
npm run check
npx convex dev --once
npm run build
npx @convex-dev/static-hosting upload --dist out
```

`npm run check` runs 24 focused tests, ESLint, TypeScript, and the static production build. The tests cover owner isolation, redacted revocable links, stale-source guards, grounded quotes, conditional and withdrawn commitments, duplicate and out-of-order replies, unsafe URLs, and unsent-mail recovery.

## Product boundaries

WayThrough does not infer physical accessibility from a marketing claim, turn an unknown step into a guarantee, expose private requirements through a share link, or send a message from the fictional example. A configured provider is shown as configuration status; only a completed provider call creates source or delivery evidence.

See [hackathon.md](./hackathon.md) for the public build log and [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) for the under-three-minute walkthrough.

The 41-second guided tour is [playable here](https://raj921.github.io/waythrough/) or available as [docs/waythrough-demo.mp4](./docs/waythrough-demo.mp4). It shows verified app states from the labeled fictional example.
