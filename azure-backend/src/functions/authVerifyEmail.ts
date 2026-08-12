import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { badRequest, internalError, ok, options } from "../lib/http";
import { verifyEmailToken } from "../lib/emailVerification";

app.http("authVerifyEmail", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/verify-email",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const token =
        request.method === "GET"
          ? new URL(request.url).searchParams.get("token")
          : ((await request.json().catch(() => ({}))) as { token?: string }).token;

      if (!token) {
        return badRequest("Verification token is required.");
      }

      await verifyEmailToken(token);
      return ok({ verified: true, message: "Email confirmed. You can sign in now." });
    } catch (error) {
      if (error instanceof Error && error.message === "invalid_verification_token") {
        return badRequest("This verification link is invalid or has expired.");
      }
      context.error(error);
      return internalError();
    }
  }
});
