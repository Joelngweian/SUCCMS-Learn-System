import { requireUser, updateUserPassword } from "../lib/auth";
import { badRequest, internalError, ok, unauthorized } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

type PasswordRequest = {
  password?: string;
};

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const body = getJsonBody(request) as PasswordRequest;
    if (!body.password || body.password.length < 8) {
      send(context, badRequest("Password must be at least 8 characters."));
      return;
    }
    await updateUserPassword(user.id, body.password);
    send(context, ok({ updated: true }));
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
