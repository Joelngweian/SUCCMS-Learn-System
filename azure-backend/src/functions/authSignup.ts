import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { createStudentAccount } from "../lib/auth";
import {
  createEmailVerification,
  createVerificationUrl,
  sendVerificationEmail
} from "../lib/emailVerification";
import { badRequest, internalError, ok, options } from "../lib/http";
import { signupSchema } from "../lib/validators";

const signupErrorMessages: Record<string, string> = {
  invalid_student_email:
    "Only student SUC emails ending in @sc.edu.my and starting with D, B, or P can register.",
  email_already_registered: "This email is already registered.",
  username_already_registered: "This username is already taken."
};

app.http("authSignup", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/signup",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const body = signupSchema.parse(await request.json());
      const user = await createStudentAccount(body);
      const verification = await createEmailVerification(user.id);
      const verificationUrl = createVerificationUrl(
        new URL(request.url).origin,
        verification.token
      );
      let emailDelivered = false;

      try {
        const emailResult = await sendVerificationEmail({
          email: user.email || body.email,
          fullName: user.fullName || body.fullName,
          verificationUrl
        });
        emailDelivered = emailResult.delivered;
      } catch (emailError) {
        context.error(emailError);
      }

      return ok({
        requiresEmailVerification: true,
        email: user.email,
        emailDelivered,
        verificationExpiresAt: verification.expiresAt.toISOString(),
        ...(emailDelivered ? {} : { verificationUrl })
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid signup request.", error.flatten());
      }
      if (error instanceof Error && signupErrorMessages[error.message]) {
        return badRequest(signupErrorMessages[error.message]);
      }
      context.error(error);
      return internalError();
    }
  }
});
