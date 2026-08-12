import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { createCourseAssignment } from "../lib/courseAssignments";
import { badRequest, fail, internalError, ok, options, unauthorized } from "../lib/http";
import { createCourseAssignmentSchema } from "../lib/validators";

app.http("courseAssignmentCreate", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "course/assignments",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const body = createCourseAssignmentSchema.parse(await request.json());
      return ok(await createCourseAssignment(body, user));
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid assessment request.", error.flatten());
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
