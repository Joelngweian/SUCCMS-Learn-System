import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { badRequest, forbidden, internalError, ok, unauthorized } from "../lib/http";
import { AuthorizationError, runGenericQuery } from "../lib/genericDb";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const result = await runGenericQuery(getJsonBody(request) as never, user);
    send(context, ok(result));
  } catch (error) {
    if (error instanceof ZodError || isJsonParseError(error)) {
      send(context, badRequest("Invalid database query request."));
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
