import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { deleteOwnSubmission, submitAssignment } from "../lib/assignmentSubmissions";
import { badRequest, fail, internalError, ok, unauthorized } from "../lib/http";
import { assignmentIdParamSchema, submitAssignmentSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

type RequestWithParams = ClassicRequest & { params?: { assignmentId?: string } };

const handler = async (context: ClassicContext, request: RequestWithParams) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const params = assignmentIdParamSchema.parse(request.params || {});

    if (request.method === "DELETE") {
      send(context, ok(await deleteOwnSubmission(params.assignmentId, user)));
      return;
    }

    const body = submitAssignmentSchema.parse(getJsonBody(request));
    send(context, ok(await submitAssignment(params.assignmentId, body.files, user)));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid submission request.", error.flatten()));
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
    if (error instanceof Error && "status" in error && typeof error.status === "number") {
      send(context, fail(error.status, error.status === 403 ? "forbidden" : "bad_request", error.message));
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
