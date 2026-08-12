import { badRequest, internalError, ok } from "../lib/http";
import { verifyEmailToken } from "../lib/emailVerification";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const token =
      request.method?.toUpperCase() === "GET"
        ? getTokenFromUrl(request.url)
        : (getJsonBody(request) as { token?: string }).token;

    if (!token) {
      send(context, badRequest("Verification token is required."));
      return;
    }

    await verifyEmailToken(token);
    send(context, ok({ verified: true, message: "Email confirmed. You can sign in now." }));
  } catch (error) {
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    if (error instanceof Error && error.message === "invalid_verification_token") {
      send(context, badRequest("This verification link is invalid or has expired."));
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

function getTokenFromUrl(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get("token");
  } catch {
    return null;
  }
}

export = handler;
