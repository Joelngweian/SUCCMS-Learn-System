import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { badRequest, internalError, ok, options, unauthorized } from "../lib/http";
import { requireUser } from "../lib/auth";
import { createUploadUrl } from "../lib/blob";
import { createUploadUrlSchema } from "../lib/validators";

app.http("storageCreateUploadUrl", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "storage/upload-url",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const body = createUploadUrlSchema.parse(await request.json());

      return ok(
        await createUploadUrl({
          ownerId: user.id,
          domain: body.domain,
          fileName: body.fileName,
          contentType: body.contentType
        })
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid upload URL request.", error.flatten());
      }
      if (error instanceof Error && error.message === "missing_bearer_token") {
        return unauthorized();
      }
      context.error(error);
      return internalError();
    }
  }
});
