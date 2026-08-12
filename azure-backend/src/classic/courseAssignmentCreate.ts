import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { createCourseAssignment } from "../lib/courseAssignments";
import { badRequest, fail, internalError, ok, unauthorized } from "../lib/http";
import { createCourseAssignmentSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const body = createCourseAssignmentSchema.parse(getJsonBody(request));
    send(context, ok(await createCourseAssignment(body, user)));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid assessment request.", error.flatten()));
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
    if (error instanceof Error && "status" in error && typeof error.status === "number") {
      send(context, fail(error.status, error.status === 403 ? "forbidden" : "bad_request", error.message));
      return;
    }
    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
