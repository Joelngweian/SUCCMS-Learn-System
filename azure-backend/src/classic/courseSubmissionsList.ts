import { ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { listCourseSubmissions } from "../lib/assignmentSubmissions";
import { badRequest, fail, internalError, ok, unauthorized } from "../lib/http";
import { courseIdParamSchema } from "../lib/validators";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { handleOptions, logError, send, toAuthRequest } from "./runtime";

type RequestWithParams = ClassicRequest & { params?: { courseId?: string } };

const handler = async (context: ClassicContext, request: RequestWithParams) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const params = courseIdParamSchema.parse(request.params || {});
    send(context, ok(await listCourseSubmissions(params.courseId, user)));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid submissions request.", error.flatten()));
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
