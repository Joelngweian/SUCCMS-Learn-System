import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { createReadUrl } from "../lib/blob";
import { badRequest, internalError, ok, unauthorized } from "../lib/http";
import { createReadUrlSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    await requireUser(toAuthRequest(request));
    const body = createReadUrlSchema.parse(getJsonBody(request));
    send(context, ok(await createReadUrl(body.path, body.expiresInSeconds)));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid read URL request.", error.flatten()));
      return;
    }
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    if (error instanceof Error && error.message === "missing_bearer_token") {
      send(context, unauthorized());
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
