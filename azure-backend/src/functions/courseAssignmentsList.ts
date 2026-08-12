import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { z, ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { listCourseAssignments } from "../lib/courseAssignments";
import { badRequest, fail, internalError, ok, options, unauthorized } from "../lib/http";

const paramsSchema = z.object({
  courseId: z.string().uuid()
});

app.http("courseAssignmentsList", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "course/{courseId}/assignments",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const params = paramsSchema.parse(request.params);
      return ok(await listCourseAssignments(params.courseId, user));
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid course assignments request.", error.flatten());
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
