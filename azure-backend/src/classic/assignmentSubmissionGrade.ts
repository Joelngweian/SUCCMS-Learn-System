import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { saveSubmissionGrade } from "../lib/assignmentSubmissions";
import { badRequest, fail, internalError, ok, unauthorized } from "../lib/http";
import { gradeSubmissionSchema, submissionIdParamSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

type RequestWithParams = ClassicRequest & { params?: { submissionId?: string } };

const handler = async (context: ClassicContext, request: RequestWithParams) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const params = submissionIdParamSchema.parse(request.params || {});
    const body = gradeSubmissionSchema.parse(getJsonBody(request));
    send(context, ok(await saveSubmissionGrade(
      params.submissionId,
      body.grade,
      body.feedback,
      body.rubricGrades,
      user
    )));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid grading request.", error.flatten()));
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
