import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { deleteOwnSubmission } from "../lib/assignmentSubmissions";
import { badRequest, fail, internalError, ok, options, unauthorized } from "../lib/http";
import { assignmentIdParamSchema } from "../lib/validators";

app.http("assignmentSubmissionDelete", {
  methods: ["DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "assignments/{assignmentId}/submission",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const params = assignmentIdParamSchema.parse(request.params);
      return ok(await deleteOwnSubmission(params.assignmentId, user));
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
