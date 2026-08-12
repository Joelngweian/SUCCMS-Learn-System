import { requireUser } from "../lib/auth";
import { invokeCompatFunction } from "../lib/functionCompat";
import { badRequest, internalError, ok, unauthorized } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

type RequestWithParams = ClassicRequest & {
  params?: {
    name?: string;
  };
};

const handler = async (context: ClassicContext, request: RequestWithParams) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const name = request.params?.name || "";
    if (!name) {
      send(context, badRequest("Function name is required."));
      return;
    }
    const result = await invokeCompatFunction(name, { body: getJsonBody(request) }, user);
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
    logError(context, error);
    send(context, internalError(error instanceof Error ? error.message : undefined));
  }
};

export = handler;
