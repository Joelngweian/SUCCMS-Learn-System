import { ZodError } from "zod";
import { setInitialPassword, signUserToken } from "../lib/auth";
import { getConfig } from "../lib/config";
import { badRequest, forbidden, internalError, ok } from "../lib/http";
import { bootstrapPasswordSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const body = bootstrapPasswordSchema.parse(getJsonBody(request));
    const expectedKey = getConfig().authBootstrapKey;
    if (!expectedKey || body.bootstrapKey !== expectedKey) {
      send(context, forbidden("Invalid bootstrap key."));
      return;
    }

    const user = await setInitialPassword(body.email, body.password);
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
      send(context, badRequest("Invalid password bootstrap request.", error.flatten()));
      return;
    }
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    if (error instanceof Error && error.message === "user_not_found") {
      send(context, badRequest("No migrated user profile exists for this email."));
      return;
    }
    if (error instanceof Error && error.message === "user_disabled") {
      send(context, forbidden("This user is disabled."));
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
