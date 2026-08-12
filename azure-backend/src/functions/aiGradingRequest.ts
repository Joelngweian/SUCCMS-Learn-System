import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { createAndProcessAiGradingJob } from "../lib/aiGrading";
import { accepted, badRequest, fail, internalError, options, unauthorized } from "../lib/http";
import { requireUser } from "../lib/auth";
import { aiGradingRequestSchema } from "../lib/validators";

app.http("aiGradingRequest", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "ai/grading-requests",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const body = aiGradingRequestSchema.parse(await request.json());
      const job = await createAndProcessAiGradingJob({
        assignmentId: body.assignmentId,
        studentId: body.studentId,
        requester: user
      });

      return accepted(job);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid AI grading request.", error.flatten());
      }
      if (error instanceof Error && error.message === "missing_bearer_token") {
        return unauthorized();
      }
      if (error instanceof Error && "status" in error && typeof error.status === "number") {
        return fail(error.status, error.status === 403 ? "forbidden" : "bad_request", error.message);
      }
      context.error(error);
      return internalError(
        error instanceof Error && error.message
          ? error.message
          : "The request could not be completed."
      );
    }
  }
});
