# WayThrough submission sheet

Copy these values into the All Gas submission form.

- Project: WayThrough
- Live app: https://colorful-marlin-799.convex.site
- Public repo: https://github.com/raj921/waythrough
- Demo video: https://raj921.github.io/waythrough/waythrough-demo.mp4, 41 seconds
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

Built WayThrough for the Convex All Gas Hackathon: an evidence-linked visit planner that changes the route when a venue promise becomes conditional or is withdrawn. Try the clearly labeled fictional example, inspect the source, and open a read-only route. Convex powers the live state. Firecrawl, OpenAI, and AgentMail integrations are coded but awaiting provider credentials and a verified round trip. Try it: https://colorful-marlin-799.convex.site  Source: https://github.com/raj921/waythrough  @convex @OpenAI @firecrawl @agentmail
