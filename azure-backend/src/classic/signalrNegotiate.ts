import { requireUser } from "../lib/auth";
import { corsHeaders, internalError, unauthorized } from "../lib/http";
import { createSignalRNegotiation } from "../lib/realtime";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { handleOptions, logError, send, toAuthRequest } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    send(context, {
      status: 200,
      jsonBody: await createSignalRNegotiation(user),
      headers: {
        ...corsHeaders,
        "content-type": "application/json; charset=utf-8"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "missing_bearer_token") {
      send(context, unauthorized());
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
