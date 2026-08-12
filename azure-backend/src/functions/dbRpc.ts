import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser } from "../lib/auth";
import { badRequest, forbidden, internalError, ok, options, unauthorized } from "../lib/http";
import { AuthorizationError, runGenericRpc } from "../lib/genericDb";

type RpcRequest = {
  name?: string;
  args?: Record<string, unknown>;
};

app.http("dbRpc", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "db/rpc",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();
      const user = await requireUser(request);
      const body = await request.json() as RpcRequest;
      if (!body.name) return badRequest("RPC name is required.");
      const result = await runGenericRpc(body.name, body.args || {}, user);
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
