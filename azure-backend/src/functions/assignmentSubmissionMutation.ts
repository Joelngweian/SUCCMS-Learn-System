import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { deleteOwnSubmission, submitAssignment } from "../lib/assignmentSubmissions";
import { badRequest, fail, internalError, ok, options, unauthorized } from "../lib/http";
import { assignmentIdParamSchema, submitAssignmentSchema } from "../lib/validators";

app.http("assignmentSubmissionMutation", {
  methods: ["POST", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "assignments/{assignmentId}/submission",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const params = assignmentIdParamSchema.parse(request.params);

      if (request.method === "DELETE") {
        return ok(await deleteOwnSubmission(params.assignmentId, user));
      }

      const body = submitAssignmentSchema.parse(await request.json());
      return ok(await submitAssignment(params.assignmentId, body.files, user));
    } catch (error) {
      if (error instanceof ZodError) return badRequest("Invalid submission request.", error.flatten());
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      if (error instanceof Error && "status" in error && typeof error.status === "number") {
        return fail(error.status, error.status === 403 ? "forbidden" : "bad_request", error.message);
      }
      context.error(error);
      return internalError();
    }
  }
});
