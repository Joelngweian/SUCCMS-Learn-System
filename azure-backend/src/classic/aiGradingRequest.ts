import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { createAndProcessAiGradingJob } from "../lib/aiGrading";
import { accepted, badRequest, fail, internalError, unauthorized } from "../lib/http";
import { aiGradingRequestSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const body = aiGradingRequestSchema.parse(getJsonBody(request));
    const job = await createAndProcessAiGradingJob({
      assignmentId: body.assignmentId,
      studentId: body.studentId,
      requester: user
    });

    send(context, accepted(job));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid AI grading request.", error.flatten()));
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
    send(context, internalError(
      error instanceof Error && error.message
        ? error.message
        : "The request could not be completed."
    ));
  }
};

export = handler;
