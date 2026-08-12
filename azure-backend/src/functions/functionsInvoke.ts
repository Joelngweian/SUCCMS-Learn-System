import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser } from "../lib/auth";
import { invokeCompatFunction } from "../lib/functionCompat";
import { badRequest, internalError, ok, options, unauthorized } from "../lib/http";

app.http("functionsInvoke", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "functions/{name}",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();
      const user = await requireUser(request);
      const name = request.params.name || "";
      if (!name) return badRequest("Function name is required.");
      const body = await request.json();
      return ok(await invokeCompatFunction(name, { body }, user));
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      if (error instanceof SyntaxError) return badRequest("Invalid JSON request body.");
      context.error(error);
      return internalError(error instanceof Error ? error.message : undefined);
    }
  }
});
