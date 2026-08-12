import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { setInitialPassword, signUserToken } from "../lib/auth";
import { getConfig } from "../lib/config";
import { badRequest, forbidden, internalError, ok, options } from "../lib/http";
import { bootstrapPasswordSchema } from "../lib/validators";

app.http("authBootstrapPassword", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/bootstrap-password",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const body = bootstrapPasswordSchema.parse(await request.json());
      const expectedKey = getConfig().authBootstrapKey;
      if (!expectedKey || body.bootstrapKey !== expectedKey) {
        return forbidden("Invalid bootstrap key.");
      }

      const user = await setInitialPassword(body.email, body.password);
      const accessToken = await signUserToken(user);

      return ok({
        accessToken,
        tokenType: "Bearer",
        expiresInSeconds: 12 * 60 * 60,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          faculty: user.faculty,
          programme: user.programme
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid password bootstrap request.", error.flatten());
      }
      if (error instanceof Error && error.message === "user_not_found") {
        return badRequest("No migrated user profile exists for this email.");
      }
      if (error instanceof Error && error.message === "user_disabled") {
        return forbidden("This user is disabled.");
      }
      context.error(error);
      return internalError();
    }
  }
});
