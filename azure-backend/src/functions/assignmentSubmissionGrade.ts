import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { saveSubmissionGrade } from "../lib/assignmentSubmissions";
import { badRequest, fail, internalError, ok, options, unauthorized } from "../lib/http";
import { gradeSubmissionSchema, submissionIdParamSchema } from "../lib/validators";

app.http("assignmentSubmissionGrade", {
  methods: ["PATCH", "OPTIONS"],
  authLevel: "anonymous",
  route: "assignment-submissions/{submissionId}/grade",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const params = submissionIdParamSchema.parse(request.params);
      const body = gradeSubmissionSchema.parse(await request.json());
      return ok(await saveSubmissionGrade(
        params.submissionId,
        body.grade,
        body.feedback,
        body.rubricGrades,
        user
      ));
    } catch (error) {
      if (error instanceof ZodError) return badRequest("Invalid grading request.", error.flatten());
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      if (error instanceof Error && "status" in error && typeof error.status === "number") {
        return fail(error.status, error.status === 403 ? "forbidden" : "bad_request", error.message);
      }
      context.error(error);
      return internalError();
    }
  }
});
