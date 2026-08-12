import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { createUploadUrl } from "../lib/blob";
import { badRequest, internalError, ok, unauthorized } from "../lib/http";
import { createUploadUrlSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const body = createUploadUrlSchema.parse(getJsonBody(request));

    send(
      context,
      ok(
        await createUploadUrl({
          ownerId: user.id,
          domain: body.domain,
          fileName: body.fileName,
          contentType: body.contentType
        })
      )
    );
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid upload URL request.", error.flatten()));
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
