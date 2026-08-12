import { requireUser } from "../lib/auth";
import { internalError, ok, unauthorized } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { handleOptions, logError, send, toAuthRequest } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    send(
      context,
      ok({
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        faculty: user.faculty,
        programme: user.programme
      })
    );
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
