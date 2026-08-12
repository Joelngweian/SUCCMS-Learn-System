import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { deleteOwnSubmission } from "../lib/assignmentSubmissions";
import { badRequest, fail, internalError, ok, unauthorized } from "../lib/http";
import { assignmentIdParamSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { handleOptions, logError, send, toAuthRequest } from "./runtime";

type RequestWithParams = ClassicRequest & { params?: { assignmentId?: string } };

const handler = async (context: ClassicContext, request: RequestWithParams) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const params = assignmentIdParamSchema.parse(request.params || {});
    send(context, ok(await deleteOwnSubmission(params.assignmentId, user)));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid submission request.", error.flatten()));
      return;
    }
    if (error instanceof Error && error.message === "missing_bearer_token") {
      send(context, unauthorized());
      return;
    }
    if (error instanceof Error && "status" in error && typeof error.status === "number") {
      send(context, fail(error.status, error.status === 403 ? "forbidden" : "bad_request", error.message));
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
