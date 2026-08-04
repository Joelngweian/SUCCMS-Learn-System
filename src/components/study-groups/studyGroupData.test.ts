import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudyGroupPost } from "./StudyGroupTypes";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: supabaseMock.from,
    storage: {
      from: supabaseMock.storageFrom,
    },
  },
}));

describe("studyGroupData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates online sessions without an external meeting link or attendee limit", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue({ insert });

    const { createStudySession } = await import("./studyGroupData");

    await createStudySession({
      createdBy: "owner-1",
      description: "Review SQL joins",
      endsAt: "2026-08-04T11:00:00.000Z",
      groupId: "group-1",
      locationText: null,
      locationType: "online",
      startsAt: "2026-08-04T10:00:00.000Z",
      title: "Database revision",
    } as Parameters<typeof createStudySession>[0]);

    expect(supabaseMock.from).toHaveBeenCalledWith("study_group_sessions");
    expect(insert).toHaveBeenCalledWith({
      group_id: "group-1",
      created_by: "owner-1",
      title: "Database revision",
      description: "Review SQL joins",
      starts_at: "2026-08-04T10:00:00.000Z",
      ends_at: "2026-08-04T11:00:00.000Z",
      location_type: "online",
      location_text: null,
      meeting_url: null,
      max_attendees: null,
    });
  });

  it("deletes only the current user's group message and then removes its attachment", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const authorEq = vi.fn().mockResolvedValue({ error: null });
    const idEq = vi.fn().mockReturnValue({ eq: authorEq });
    const deletePost = vi.fn().mockReturnValue({ eq: idEq });
    supabaseMock.from.mockReturnValue({ delete: deletePost });
    supabaseMock.storageFrom.mockReturnValue({ remove });

    const { deleteStudyGroupPost } = await import("./studyGroupData");

    await deleteStudyGroupPost(
      {
        id: "post-1",
        attachment_path: "group-1/user-1/file.png",
      } as StudyGroupPost,
      "user-1",
    );

    expect(supabaseMock.from).toHaveBeenCalledWith("study_group_posts");
    expect(idEq).toHaveBeenCalledWith("id", "post-1");
    expect(authorEq).toHaveBeenCalledWith("author_id", "user-1");
    expect(supabaseMock.storageFrom).toHaveBeenCalledWith("study-group-files");
    expect(remove).toHaveBeenCalledWith(["group-1/user-1/file.png"]);
  });

  it("keeps the attachment when deleting the post is rejected", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const authorEq = vi.fn().mockResolvedValue({
      error: new Error("RLS rejected delete"),
    });
    const idEq = vi.fn().mockReturnValue({ eq: authorEq });
    const deletePost = vi.fn().mockReturnValue({ eq: idEq });
    supabaseMock.from.mockReturnValue({ delete: deletePost });
    supabaseMock.storageFrom.mockReturnValue({ remove });

    const { deleteStudyGroupPost } = await import("./studyGroupData");

    await expect(
      deleteStudyGroupPost(
        {
          id: "post-2",
          attachment_path: "group-1/user-2/file.png",
        } as StudyGroupPost,
        "user-1",
      ),
    ).rejects.toThrow("RLS rejected delete");

    expect(remove).not.toHaveBeenCalled();
  });
});
