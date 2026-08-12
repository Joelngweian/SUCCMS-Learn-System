import { ZodError } from "zod";
import { createStudentAccount } from "../lib/auth";
import {
  createEmailVerification,
  createVerificationUrl,
  sendVerificationEmail
} from "../lib/emailVerification";
import { badRequest, internalError, ok } from "../lib/http";
import { signupSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import {
  getJsonBody,
  getRequestOrigin,
  handleOptions,
  isJsonParseError,
  logError,
  send
} from "./runtime";

const signupErrorMessages: Record<string, string> = {
  invalid_student_email:
    "Only student SUC emails ending in @sc.edu.my and starting with D, B, or P can register.",
  email_already_registered: "This email is already registered.",
  username_already_registered: "This username is already taken."
};

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const body = signupSchema.parse(getJsonBody(request));
    const user = await createStudentAccount(body);
    const verification = await createEmailVerification(user.id);
    const verificationUrl = createVerificationUrl(
      getRequestOrigin(request),
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
      logError(context, emailError);
    }

    send(
      context,
      ok({
        requiresEmailVerification: true,
        email: user.email,
        emailDelivered,
        verificationExpiresAt: verification.expiresAt.toISOString(),
        ...(emailDelivered ? {} : { verificationUrl })
      })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid signup request.", error.flatten()));
      return;
    }
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    if (error instanceof Error && signupErrorMessages[error.message]) {
      send(context, badRequest(signupErrorMessages[error.message]));
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
