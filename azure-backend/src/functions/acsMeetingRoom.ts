import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { requireUser } from "../lib/auth";
import { createAcsMeetingRoomAccess } from "../lib/acs";
import { badRequest, forbidden, internalError, ok, options, unauthorized } from "../lib/http";

type MeetingRoomRequestBody = {
  groupId?: unknown;
};

app.http("acsMeetingRoom", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "acs/meeting-room",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      if (request.method === "OPTIONS") return options();

      const user = await requireUser(request);
      const body = (await request.json().catch(() => ({}))) as MeetingRoomRequestBody;
      if (typeof body.groupId !== "string") {
        return badRequest("Study group id is required.");
      }

      return ok(await createAcsMeetingRoomAccess(user, body.groupId));
    } catch (error) {
      if (error instanceof Error && error.message === "missing_bearer_token") {
        return unauthorized();
      }
      if (error instanceof Error && error.message === "invalid_group_id") {
        return badRequest("Study group id is invalid.");
      }
      if (error instanceof Error && error.message === "study_group_not_found_or_forbidden") {
        return forbidden("You must be a study group member to join this meeting room.");
      }
      if (error instanceof Error && error.message === "acs_not_configured") {
        return internalError("Azure Communication Services is not configured.");
      }

      context.error(error);
      return internalError();
    }
  }
});
