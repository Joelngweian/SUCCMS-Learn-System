import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { getAiGradingJobForUser } from "../lib/aiGrading";
import { fail, internalError, ok, unauthorized } from "../lib/http";
import { aiGradingJobStatusSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { handleOptions, logError, send, toAuthRequest } from "./runtime";

type RouteRequest = ClassicRequest & {
  params?: {
    jobId?: string;
  };
};

const handler = async (context: ClassicContext, request: RouteRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const params = aiGradingJobStatusSchema.parse({
      jobId: request.params?.jobId
    });
    const job = await getAiGradingJobForUser(params.jobId, user);
    if (!job) {
      send(context, fail(404, "not_found", "AI grading job not found."));
      return;
    }

    send(context, ok(job));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, fail(400, "bad_request", "Invalid AI grading job request.", error.flatten()));
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
