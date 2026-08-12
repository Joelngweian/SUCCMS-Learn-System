import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { listCourseSubmissions } from "../lib/assignmentSubmissions";
import { badRequest, fail, internalError, ok, options, unauthorized } from "../lib/http";
import { courseIdParamSchema } from "../lib/validators";

app.http("courseSubmissionsList", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "course/{courseId}/submissions",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const params = courseIdParamSchema.parse(request.params);
      return ok(await listCourseSubmissions(params.courseId, user));
    } catch (error) {
      if (error instanceof ZodError) return badRequest("Invalid submissions request.", error.flatten());
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      if (error instanceof Error && "status" in error && typeof error.status === "number") {
        return fail(error.status, error.status === 403 ? "forbidden" : "bad_request", error.message);
      }
      context.error(error);
      return internalError();
    }
  }
});
