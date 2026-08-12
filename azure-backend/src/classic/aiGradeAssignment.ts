import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { generateAiGradeDraft } from "../lib/gemini";
import { badRequest, internalError, ok, unauthorized } from "../lib/http";
import { aiGradeAssignmentSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    await requireUser(toAuthRequest(request));
    const body = aiGradeAssignmentSchema.parse(getJsonBody(request));
    const draft = await generateAiGradeDraft(body);

    send(context, ok(draft));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid AI grading payload.", error.flatten()));
      return;
    }
    if (isJsonParseError(error)) {
      send(context, badRequest("Invalid JSON request body."));
      return;
    }
    if (error instanceof Error && error.message === "missing_bearer_token") {
      send(context, unauthorized());
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
