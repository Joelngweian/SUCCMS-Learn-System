import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { getAiGradingJobForUser } from "../lib/aiGrading";
import { fail, internalError, ok, options, unauthorized } from "../lib/http";
import { requireUser } from "../lib/auth";
import { aiGradingJobStatusSchema } from "../lib/validators";

app.http("aiGradingJobStatus", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "ai/grading-jobs/{jobId}",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const params = aiGradingJobStatusSchema.parse({
        jobId: request.params.jobId
      });
      const job = await getAiGradingJobForUser(params.jobId, user);
      if (!job) return fail(404, "not_found", "AI grading job not found.");

      return ok(job);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(400, "bad_request", "Invalid AI grading job request.", error.flatten());
      }
      if (error instanceof Error && error.message === "missing_bearer_token") {
        return unauthorized();
      }
      if (error instanceof Error && "status" in error && typeof error.status === "number") {
        return fail(error.status, error.status === 403 ? "forbidden" : "bad_request", error.message);
      }
      context.error(error);
      return internalError();
    }
  }
});
