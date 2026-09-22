# WayThrough submission sheet

Submitted to VibeApps on 23 September 2026 at 00:18 IST. Public entry: https://vibeapps.dev/s/waythrough

- Project: WayThrough
- Live app: https://colorful-marlin-799.convex.site
- Public repo: https://github.com/raj921/waythrough
- Demo video: https://raj921.github.io/waythrough/waythrough-demo.mp4?v=142002d, 41 seconds
- Build log: `hackathon.md`

## Description

WayThrough turns an uncertain venue visit into a route you can inspect. Convex keeps the plan realtime, private to the browser session, and honest when evidence goes stale or a conditional promise is withdrawn. Firecrawl retrieval, OpenAI extraction, and AgentMail requests and replies are implemented behind deployment credentials, but their live round trip has not yet been verified.

## What to show

Open the live URL, start a private session, choose the fictional Riverside Gallery example, open Evidence, confirm staffing, create a read-only route link, then withdraw staffing. The route moves from arrangement-needed to supported and back again through Convex state. The example is labeled fictional and never sends mail.

## Provider readiness

The public app and example are ready. Before claiming a real sponsor round trip, configure these deployment secrets in the Convex dashboard without pasting them into chat:

- `OPENAI_API_KEY`
- `FIRECRAWL_API_KEY`
- `AGENTMAIL_API_KEY`
- `AGENTMAIL_WEBHOOK_SECRET` returned when registering `https://colorful-marlin-799.convex.site/agentmail/webhook` for `message.received`

After configuration, create one real visit with a public venue page, verify the source capture, send only to a controlled recipient, and wait for the signed reply. The Connections panel is the evidence gate; it must show all four provider rows configured before describing that round trip as live.

## Social copy

Built WayThrough for #AllGasHackathon: an access route where each step cites its source and a withdrawn venue promise changes the plan. Try the fictional live Convex demo and 41s tour: https://vibeapps.dev/s/waythrough @convex @OpenAI @firecrawl @agentmail
