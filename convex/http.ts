import { httpRouter } from "convex/server";
import { httpAction, type MutationCtx } from "./_generated/server";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { AgentMail } from "@agentmail/convex";
import { components, internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({ path: "/agentmail/webhook", method: "POST", handler: httpAction(async (ctx, req) => {
  if (!process.env.AGENTMAIL_WEBHOOK_SECRET) return new Response("Webhook not configured", { status: 503 });
  // AgentMail 0.1 types this as MutationCtx; its implementation calls only the
  // two-argument runMutation API also supported by HTTP actions.
  const webhookCtx = { runMutation: ctx.runMutation as MutationCtx["runMutation"] };
  return new AgentMail(components.agentmail, { onMessageReceived: internal.mail.received }).handleWebhook(webhookCtx, req);
}) });
registerStaticRoutes(http, components.staticHosting);
export default http;
