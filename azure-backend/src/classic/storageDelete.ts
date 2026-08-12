import { requireUser } from "../lib/auth";
import { deleteBlobPaths } from "../lib/blob";
import { badRequest, internalError, ok, unauthorized } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

type DeleteRequest = {
  paths?: string[];
};

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    await requireUser(toAuthRequest(request));
    const body = getJsonBody(request) as DeleteRequest;
    const paths = Array.isArray(body.paths)
      ? body.paths.filter((path): path is string => typeof path === "string" && path.trim().length > 0)
      : [];
    if (paths.length === 0) {
      send(context, badRequest("At least one storage path is required."));
      return;
    }
    send(context, ok(await deleteBlobPaths(paths)));
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
