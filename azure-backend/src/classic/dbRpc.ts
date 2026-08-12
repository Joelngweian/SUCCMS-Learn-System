import { requireUser } from "../lib/auth";
import { badRequest, forbidden, internalError, ok, unauthorized } from "../lib/http";
import { AuthorizationError, runGenericRpc } from "../lib/genericDb";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

type RpcRequest = {
  name?: string;
  args?: Record<string, unknown>;
};

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const body = getJsonBody(request) as RpcRequest;
    if (!body.name) {
      send(context, badRequest("RPC name is required."));
      return;
    }
    const result = await runGenericRpc(body.name, body.args || {}, user);
    send(context, ok(result));
  } catch (error) {
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    if (error instanceof Error && error.message === "missing_bearer_token") {
      send(context, unauthorized());
      return;
    }
    if (error instanceof AuthorizationError) {
      send(context, forbidden(error.message));
      return;
    }
    logError(context, error);
    send(context, internalError(error instanceof Error ? error.message : undefined));
  }
};

export = handler;
