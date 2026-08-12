import { z, ZodError } from "zod";
import { requireUser } from "../lib/auth";
import { listCourseAssignments } from "../lib/courseAssignments";
import { badRequest, fail, internalError, ok, unauthorized } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { handleOptions, logError, send, toAuthRequest } from "./runtime";

const paramsSchema = z.object({
  courseId: z.string().uuid()
});

type CourseAssignmentsListRequest = ClassicRequest & {
  params?: {
    courseId?: string;
  };
};

const handler = async (context: ClassicContext, request: CourseAssignmentsListRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const params = paramsSchema.parse(request.params || {});
    send(context, ok(await listCourseAssignments(params.courseId, user)));
  } catch (error) {
    if (error instanceof ZodError) {
      send(context, badRequest("Invalid course assignments request.", error.flatten()));
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
