import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { authenticatePassword, signUserToken } from "../lib/auth";
import { badRequest, forbidden, internalError, ok, options, unauthorized } from "../lib/http";
import { loginSchema } from "../lib/validators";

app.http("authLogin", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/login",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const body = loginSchema.parse(await request.json());
      const user = await authenticatePassword(body.email, body.password);
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
        return badRequest("Invalid login request.", error.flatten());
      }
      if (error instanceof Error && error.message === "invalid_credentials") {
        return unauthorized("Invalid email or password.");
      }
      if (error instanceof Error && error.message === "email_not_verified") {
        return forbidden("Please confirm your email before signing in.");
      }
      context.error(error);
      return internalError();
    }
  }
});
