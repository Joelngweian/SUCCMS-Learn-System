import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser, updateUserPassword } from "../lib/auth";
import { badRequest, internalError, ok, options, unauthorized } from "../lib/http";

type PasswordRequest = {
  password?: string;
};

app.http("authUpdatePassword", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/password",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();
      const user = await requireUser(request);
      const body = await request.json() as PasswordRequest;
      if (!body.password || body.password.length < 8) {
        return badRequest("Password must be at least 8 characters.");
      }
      await updateUserPassword(user.id, body.password);
      return ok({ updated: true });
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      if (error instanceof SyntaxError) return badRequest("Invalid JSON request body.");
      context.error(error);
      return internalError(error instanceof Error ? error.message : undefined);
    }
  }
});
