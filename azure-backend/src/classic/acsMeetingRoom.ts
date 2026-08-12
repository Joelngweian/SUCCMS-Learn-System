import { requireUser } from "../lib/auth";
import { createAcsMeetingRoomAccess } from "../lib/acs";
import { badRequest, forbidden, internalError, ok, unauthorized } from "../lib/http";
import type { ClassicContext, ClassicRequest } from "./runtime";
import { getJsonBody, handleOptions, isJsonParseError, logError, send, toAuthRequest } from "./runtime";

type MeetingRoomRequestBody = {
  groupId?: unknown;
};

const handler = async (context: ClassicContext, request: ClassicRequest) => {
  if (handleOptions(context, request)) return;

  try {
    const user = await requireUser(toAuthRequest(request));
    const body = getJsonBody(request) as MeetingRoomRequestBody;
    if (typeof body.groupId !== "string") {
      send(context, badRequest("Study group id is required."));
      return;
    }

    send(context, ok(await createAcsMeetingRoomAccess(user, body.groupId)));
  } catch (error) {
    if (isJsonParseError(error)) {
      send(context, badRequest("Request body must be valid JSON."));
      return;
    }
    if (error instanceof Error && error.message === "missing_bearer_token") {
      send(context, unauthorized());
      return;
    }
    if (error instanceof Error && error.message === "invalid_group_id") {
      send(context, badRequest("Study group id is invalid."));
      return;
    }
    if (error instanceof Error && error.message === "study_group_not_found_or_forbidden") {
      send(context, forbidden("You must be a study group member to join this meeting room."));
      return;
    }
    if (error instanceof Error && error.message === "acs_not_configured") {
      send(context, internalError("Azure Communication Services is not configured."));
      return;
    }

    logError(context, error);
    send(context, internalError());
  }
};

export = handler;
