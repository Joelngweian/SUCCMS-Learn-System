import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { createReadUrl } from "../lib/blob";
import { corsHeaders, internalError, options } from "../lib/http";

app.http("storagePublicRead", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "storage/public",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();
      const path = decodeURIComponent(request.query.get("path") || "");
      if (!path) return internalError("Storage path is required.");
      const read = await createReadUrl(path, 3600);
      return {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: read.url
        }
      };
    } catch (error) {
      context.error(error);
      return internalError(error instanceof Error ? error.message : undefined);
    }
  }
});
