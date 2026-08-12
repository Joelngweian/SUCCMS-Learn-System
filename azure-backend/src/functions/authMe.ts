import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser } from "../lib/auth";
import { internalError, ok, options, unauthorized } from "../lib/http";

app.http("authMe", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/me",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      return ok({
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        faculty: user.faculty,
        programme: user.programme
      });
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") {
        return unauthorized();
      }
      context.error(error);
      return internalError();
    }
  }
});
