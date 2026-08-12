import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser } from "../lib/auth";
import { broadcastRealtimeMessage } from "../lib/realtime";
import { badRequest, internalError, ok, options, unauthorized } from "../lib/http";

type BroadcastRequest = {
  event?: string;
  payload?: unknown;
  topic?: string;
};

app.http("realtimeBroadcast", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "signalr/broadcast",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();
      await requireUser(request);
      const body = await request.json() as BroadcastRequest;
      if (!body.topic || typeof body.topic !== "string") {
        return badRequest("Realtime topic is required.");
      }

      await broadcastRealtimeMessage({
        topic: body.topic,
        event: typeof body.event === "string" ? body.event : "UPDATE",
        payload: body.payload,
      });
      return ok({ sent: true });
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      if (error instanceof SyntaxError) return badRequest("Invalid JSON request body.");
      context.error(error);
      return internalError(error instanceof Error ? error.message : undefined);
    }
  }
});
