import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser } from "../lib/auth";
import { deleteBlobPaths } from "../lib/blob";
import { badRequest, internalError, ok, options, unauthorized } from "../lib/http";

type DeleteRequest = {
  paths?: string[];
};

app.http("storageDelete", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "storage/delete",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();
      await requireUser(request);
      const body = await request.json() as DeleteRequest;
      const paths = Array.isArray(body.paths)
        ? body.paths.filter((path): path is string => typeof path === "string" && path.trim().length > 0)
        : [];
      if (paths.length === 0) return badRequest("At least one storage path is required.");
      return ok(await deleteBlobPaths(paths));
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      if (error instanceof SyntaxError) return badRequest("Invalid JSON request body.");
      context.error(error);
      return internalError(error instanceof Error ? error.message : undefined);
    }
  }
});
