import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError, z } from "zod";
import { findPasswordUserByEmail } from "../lib/auth";
import {
  createEmailVerification,
  createVerificationUrl,
  sendVerificationEmail
} from "../lib/emailVerification";
import { badRequest, internalError, ok, options } from "../lib/http";

const resendVerificationSchema = z.object({
  email: z.string().email().max(320)
});

app.http("authResendVerification", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/resend-verification",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const body = resendVerificationSchema.parse(await request.json());
      const user = await findPasswordUserByEmail(body.email);
      if (!user) {
        return ok({ sent: true });
      }

      if (user.email_verified_at) {
        return ok({ sent: false, alreadyVerified: true });
      }

      const verification = await createEmailVerification(user.id);
      const verificationUrl = createVerificationUrl(
        new URL(request.url).origin,
        verification.token
      );
      let emailDelivered = false;

      try {
        const emailResult = await sendVerificationEmail({
          email: user.email,
          fullName: user.full_name,
          verificationUrl
        });
        emailDelivered = emailResult.delivered;
      } catch (emailError) {
        context.error(emailError);
      }

      return ok({
        sent: true,
        emailDelivered,
        verificationExpiresAt: verification.expiresAt.toISOString(),
        ...(emailDelivered ? {} : { verificationUrl })
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid resend verification request.", error.flatten());
      }
      context.error(error);
      return internalError();
    }
  }
});
