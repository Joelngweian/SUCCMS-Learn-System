import { requireUser } from "../lib/auth";
import { broadcastRealtimeMessage } from "../lib/realtime";
import { badRequest, internalError, ok, unauthorized } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

type BroadcastRequest = {
  event?: string;
  payload?: unknown;
  topic?: string;
};

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    await requireUser(toAuthRequest(request));
    const body = getJsonBody(request) as BroadcastRequest;
    if (!body.topic || typeof body.topic !== "string") {
      send(context, badRequest("Realtime topic is required."));
      return;
    }

    await broadcastRealtimeMessage({
      topic: body.topic,
      event: typeof body.event === "string" ? body.event : "UPDATE",
      payload: body.payload,
    });
    send(context, ok({ sent: true }));
  } catch (error) {
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    if (error instanceof Error && error.message === "missing_bearer_token") {
      send(context, unauthorized());
      return;
    }
    logError(context, error);
    send(context, internalError(error instanceof Error ? error.message : undefined));
  }
};

export = handler;
