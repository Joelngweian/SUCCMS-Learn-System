import { ZodError, z } from "zod";
import { findPasswordUserByEmail } from "../lib/auth";
import {
  createEmailVerification,
  createVerificationUrl,
  sendVerificationEmail
} from "../lib/emailVerification";
import { badRequest, internalError, ok } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import {
  getJsonBody,
  getRequestOrigin,
  handleOptions,
  isJsonParseError,
  logError,
  send
} from "./runtime";

const resendVerificationSchema = z.object({
  email: z.string().email().max(320)
});

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const body = resendVerificationSchema.parse(getJsonBody(request));
    const user = await findPasswordUserByEmail(body.email);
    if (!user) {
      send(context, ok({ sent: true }));
      return;
    }

    if (user.email_verified_at) {
      send(context, ok({ sent: false, alreadyVerified: true }));
      return;
    }

    const verification = await createEmailVerification(user.id);
    const verificationUrl = createVerificationUrl(
      getRequestOrigin(request),
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
      logError(context, emailError);
    }

    send(
      context,
      ok({
        sent: true,
        emailDelivered,
        verificationExpiresAt: verification.expiresAt.toISOString(),
        ...(emailDelivered ? {} : { verificationUrl })
      })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid resend verification request.", error.flatten()));
      return;
    }
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
