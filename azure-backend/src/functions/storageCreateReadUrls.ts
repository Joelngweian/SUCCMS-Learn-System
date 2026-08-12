import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser } from "../lib/auth";
import { createReadUrl } from "../lib/blob";
import { badRequest, internalError, ok, options, unauthorized } from "../lib/http";

type ReadUrlsRequest = {
  paths?: string[];
  expiresInSeconds?: number;
};

app.http("storageCreateReadUrls", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "storage/read-urls",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();
      await requireUser(request);
      const body = await request.json() as ReadUrlsRequest;
      const paths = Array.isArray(body.paths)
        ? body.paths.filter((path): path is string => typeof path === "string" && path.trim().length > 0)
        : [];
      if (paths.length === 0) return badRequest("At least one storage path is required.");
      const expiresInSeconds = Number(body.expiresInSeconds || 300);
      const urls = await Promise.all(
        paths.map(async path => {
          const read = await createReadUrl(path, expiresInSeconds);
          return { path, signedUrl: read.url };
        })
      );
      return ok({ urls });
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      if (error instanceof SyntaxError) return badRequest("Invalid JSON request body.");
      context.error(error);
      return internalError(error instanceof Error ? error.message : undefined);
    }
  }
});
