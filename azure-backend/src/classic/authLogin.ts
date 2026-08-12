import { ZodError } from "zod";
import { authenticatePassword, signUserToken } from "../lib/auth";
import { badRequest, forbidden, internalError, ok, unauthorized } from "../lib/http";
import { loginSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const body = loginSchema.parse(getJsonBody(request));
    const user = await authenticatePassword(body.email, body.password);
    const accessToken = await signUserToken(user);

    send(
      context,
      ok({
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
      })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid login request.", error.flatten()));
      return;
    }
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    if (error instanceof Error && error.message === "invalid_credentials") {
      send(context, unauthorized("Invalid email or password."));
      return;
    }
    if (error instanceof Error && error.message === "email_not_verified") {
      send(context, forbidden("Please confirm your email before signing in."));
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
