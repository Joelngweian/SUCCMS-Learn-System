import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { createReadUrl } from "../lib/blob";
import { badRequest, internalError, ok, options, unauthorized } from "../lib/http";
import { createReadUrlSchema } from "../lib/validators";

app.http("storageCreateReadUrl", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "storage/read-url",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      await requireUser(request);
      const body = createReadUrlSchema.parse(await request.json());
      return ok(await createReadUrl(body.path, body.expiresInSeconds));
    } catch (error) {
      if (error instanceof ZodError) return badRequest("Invalid read URL request.", error.flatten());
      if (error instanceof Error && error.message === "missing_bearer_token") return unauthorized();
      context.error(error);
      return internalError();
    }
  }
});
