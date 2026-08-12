import { azureApiFetch } from "./azureApi";

export type AcsMeetingRoomAccess = {
  roomId: string;
  token: string;
  tokenExpiresOn: string;
  communicationUserId: string;
};

export const getAcsMeetingRoomAccess = (groupId: string) =>
  azureApiFetch<AcsMeetingRoomAccess>("/api/acs/meeting-room", {
    method: "POST",
    body: JSON.stringify({ groupId }),
  });
