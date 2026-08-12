import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser } from "../lib/auth";
import { badRequest, forbidden, internalError, ok, options, unauthorized } from "../lib/http";
import { AuthorizationError, runGenericQuery } from "../lib/genericDb";

app.http("dbQuery", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "db/query",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();
      const user = await requireUser(request);
      const result = await runGenericQuery(await request.json() as never, user);
      return ok(result);
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") {
        return unauthorized();
      }
      if (error instanceof SyntaxError) {
        return badRequest("Invalid JSON request body.");
      }
      if (error instanceof AuthorizationError) {
        return forbidden(error.message);
      }
      context.error(error);
      return internalError(error instanceof Error ? error.message : undefined);
    }
  }
});
