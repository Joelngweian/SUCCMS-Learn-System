import type { CommunicationIdentityClient } from "@azure/communication-identity";
import type { RoomsClient } from "@azure/communication-rooms";
import { getConfig } from "./config";
import { getPool } from "./db";
import type { AuthenticatedUser } from "../types/auth";

type CommunicationIdentityRow = {
  communication_user_id: string;
};

type StudyGroupRoomRow = {
  acs_room_id: string;
  valid_until: Date;
};

export type AcsMeetingRoomAccess = {
  roomId: string;
  token: string;
  tokenExpiresOn: string;
  communicationUserId: string;
};

let identityClient: CommunicationIdentityClient | null = null;
let roomsClient: RoomsClient | null = null;
let schemaReady: Promise<void> | null = null;

const roomValidityHours = 12;
const renewRoomBeforeMs = 10 * 60 * 1000;

function getAcsConnectionString() {
  const { acsConnectionString } = getConfig();
  if (!acsConnectionString) {
    throw new Error("acs_not_configured");
  }
  return acsConnectionString;
}

async function getIdentityClient() {
  if (!identityClient) {
    const { CommunicationIdentityClient } = await import("@azure/communication-identity");
    identityClient = new CommunicationIdentityClient(getAcsConnectionString());
  }
  return identityClient;
}

async function getRoomsClient() {
  if (!roomsClient) {
    const { RoomsClient } = await import("@azure/communication-rooms");
    roomsClient = new RoomsClient(getAcsConnectionString());
  }
  return roomsClient;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS app_auth.communication_identities (
        user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
        communication_user_id TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS app_auth.study_group_acs_rooms (
        group_id UUID PRIMARY KEY REFERENCES public.study_groups(id) ON DELETE CASCADE,
        acs_room_id TEXT NOT NULL UNIQUE,
        valid_from TIMESTAMPTZ NOT NULL,
        valid_until TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `).then(() => undefined);
  }

  return schemaReady;
}

async function assertCanJoinStudyGroup(groupId: string, userId: string) {
  const result = await getPool().query(
    `
      SELECT study_group.id
      FROM public.study_groups study_group
      WHERE study_group.id = $1
        AND (
          study_group.created_by = $2
          OR EXISTS (
            SELECT 1
            FROM public.study_group_members member
            WHERE member.group_id = study_group.id
              AND member.user_id = $2
          )
        )
      LIMIT 1
    `,
    [groupId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error("study_group_not_found_or_forbidden");
  }
}

async function getOrCreateCommunicationUserId(userId: string) {
  const existing = await getPool().query<CommunicationIdentityRow>(
    `
      SELECT communication_user_id
      FROM app_auth.communication_identities
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (existing.rows[0]?.communication_user_id) {
    return existing.rows[0].communication_user_id;
  }

  const user = await (await getIdentityClient()).createUser();
  const inserted = await getPool().query<CommunicationIdentityRow>(
    `
      INSERT INTO app_auth.communication_identities (
        user_id,
        communication_user_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, now(), now())
      ON CONFLICT (user_id)
      DO UPDATE SET
        communication_user_id = EXCLUDED.communication_user_id,
        updated_at = now()
      RETURNING communication_user_id
    `,
    [userId, user.communicationUserId]
  );

  return inserted.rows[0].communication_user_id;
}

async function getOrCreateRoomId(groupId: string) {
  const existing = await getPool().query<StudyGroupRoomRow>(
    `
      SELECT acs_room_id, valid_until
      FROM app_auth.study_group_acs_rooms
      WHERE group_id = $1
      LIMIT 1
    `,
    [groupId]
  );

  const currentRoom = existing.rows[0];
  if (currentRoom && currentRoom.valid_until.getTime() - Date.now() > renewRoomBeforeMs) {
    return currentRoom.acs_room_id;
  }

  const validFrom = new Date(Date.now() - 5 * 60 * 1000);
  const validUntil = new Date(Date.now() + roomValidityHours * 60 * 60 * 1000);
  const room = await (await getRoomsClient()).createRoom({
    validFrom,
    validUntil,
    pstnDialOutEnabled: false
  });

  const inserted = await getPool().query<StudyGroupRoomRow>(
    `
      INSERT INTO app_auth.study_group_acs_rooms (
        group_id,
        acs_room_id,
        valid_from,
        valid_until,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, now(), now())
      ON CONFLICT (group_id)
      DO UPDATE SET
        acs_room_id = EXCLUDED.acs_room_id,
        valid_from = EXCLUDED.valid_from,
        valid_until = EXCLUDED.valid_until,
        updated_at = now()
      RETURNING acs_room_id, valid_until
    `,
    [groupId, room.id, validFrom, validUntil]
  );

  return inserted.rows[0].acs_room_id;
}

export async function createAcsMeetingRoomAccess(
  user: AuthenticatedUser,
  groupId: string
): Promise<AcsMeetingRoomAccess> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId)) {
    throw new Error("invalid_group_id");
  }

  await ensureSchema();
  await assertCanJoinStudyGroup(groupId, user.id);

  const communicationUserId = await getOrCreateCommunicationUserId(user.id);
  const roomId = await getOrCreateRoomId(groupId);

  await (await getRoomsClient()).addOrUpdateParticipants(roomId, [
    {
      id: { communicationUserId },
      role: "Presenter"
    }
  ]);

  const tokenResponse = await (await getIdentityClient()).getToken(
    { communicationUserId },
    ["voip"]
  );

  return {
    roomId,
    token: tokenResponse.token,
    tokenExpiresOn: tokenResponse.expiresOn.toISOString(),
    communicationUserId
  };
}
