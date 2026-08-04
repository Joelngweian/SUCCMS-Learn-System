import { describe, expect, it } from "vitest";
import type { StudyGroupMember, StudySession } from "./StudyGroupTypes";
import {
  getActiveMentionQuery,
  getStudyGroupMentionSuggestions,
  shouldShowOpenMeetingRoom,
} from "./studyGroupUi";

const member = (
  userId: string,
  fullName: string,
  role = "member",
): StudyGroupMember => ({
  id: `member-${userId}`,
  user_id: userId,
  role,
  joined_at: "2026-08-04T09:00:00.000Z",
  profile: {
    id: userId,
    full_name: fullName,
    avatar_url: null,
  },
});

const session = (
  locationType: "in_person" | "online",
  endsAt: string,
): StudySession => ({
  id: `${locationType}-${endsAt}`,
  group_id: "group-1",
  created_by: "owner-1",
  title: "Revision",
  description: "",
  starts_at: "2026-08-04T09:00:00.000Z",
  ends_at: endsAt,
  location_type: locationType,
  location_text: locationType === "in_person" ? "Library" : null,
  meeting_url: null,
  max_attendees: null,
  attendeeCount: 0,
  isGoing: false,
});

describe("studyGroupUi", () => {
  it("detects active mention queries only at the end of the message", () => {
    expect(getActiveMentionQuery("please check @jo")).toBe("jo");
    expect(getActiveMentionQuery("@")).toBe("");
    expect(getActiveMentionQuery("please check @jo tomorrow")).toBeNull();
  });

  it("suggests everyone and matching members for group chat mentions", () => {
    const suggestions = getStudyGroupMentionSuggestions("@jo", [
      member("user-1", "Joel Ng", "owner"),
      member("user-2", "Amelia Tan"),
    ]);

    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      "Joel Ng",
    ]);
  });

  it("suggests everyone when the user types an everyone mention", () => {
    const suggestions = getStudyGroupMentionSuggestions("@every", [
      member("user-1", "Joel Ng"),
      member("user-2", "Amelia Tan"),
    ]);

    expect(suggestions[0]).toMatchObject({
      id: "everyone",
      label: "everyone",
      description: "2 members",
    });
  });

  it("shows the meeting room button only when an online session has not ended", () => {
    const now = new Date("2026-08-04T10:00:00.000Z").getTime();

    expect(
      shouldShowOpenMeetingRoom(
        [
          session("in_person", "2026-08-04T12:00:00.000Z"),
          session("online", "2026-08-04T10:30:00.000Z"),
        ],
        now,
      ),
    ).toBe(true);

    expect(
      shouldShowOpenMeetingRoom(
        [
          session("in_person", "2026-08-04T12:00:00.000Z"),
          session("online", "2026-08-04T09:30:00.000Z"),
        ],
        now,
      ),
    ).toBe(false);
  });
});
