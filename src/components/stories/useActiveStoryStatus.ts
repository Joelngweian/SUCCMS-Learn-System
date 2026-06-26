import { useEffect, useState } from "react";
import { getActiveStoryUserIds } from "./storyRepository";

export function useActiveStoryStatus(userIds: Array<string | null | undefined>) {
  const userIdsKey = [
    ...new Set(userIds.filter((id): id is string => Boolean(id))),
  ]
    .sort()
    .join(",");
  const [activeStoryUserIds, setActiveStoryUserIds] =
    useState<Set<string>>(new Set());

  useEffect(() => {
    let isCurrent = true;
    const ids = userIdsKey ? userIdsKey.split(",") : [];

    if (ids.length === 0) {
      setActiveStoryUserIds(new Set());
      return () => {
        isCurrent = false;
      };
    }

    void getActiveStoryUserIds(ids)
      .then(result => {
        if (isCurrent) setActiveStoryUserIds(result);
      })
      .catch(error => {
        console.error("Failed to check active stories:", error);
        if (isCurrent) setActiveStoryUserIds(new Set());
      });

    return () => {
      isCurrent = false;
    };
  }, [userIdsKey]);

  return activeStoryUserIds;
}
