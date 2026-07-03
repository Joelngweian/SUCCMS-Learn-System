import {
  useEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  getSessionTimingState,
  type AttendanceSession,
} from "./attendanceTypes";

type UseAttendanceSessionSelectionArgs = {
  classHours: string;
  clock: number;
  isLecturer: boolean;
  selectedDate: string;
  selectedSessionId: string | null;
  sessions: AttendanceSession[];
  setSelectedSessionId: Dispatch<SetStateAction<string | null>>;
};

export const useAttendanceSessionSelection = ({
  classHours,
  clock,
  isLecturer,
  selectedDate,
  selectedSessionId,
  sessions,
  setSelectedSessionId,
}: UseAttendanceSessionSelectionArgs) => {
  const sessionsForSelectedDate = useMemo(
    () =>
      sessions
        .filter(session => session.class_date === selectedDate)
        .sort((a, b) => {
          const slotSort = (a.slot_no || 1) - (b.slot_no || 1);
          if (slotSort !== 0) return slotSort;
          return a.starts_at.localeCompare(b.starts_at);
        }),
    [selectedDate, sessions],
  );

  const selectedSession = useMemo(() => {
    if (sessionsForSelectedDate.length === 0) return null;
    return (
      sessionsForSelectedDate.find(session => session.id === selectedSessionId)
      || sessionsForSelectedDate[0]
    );
  }, [selectedSessionId, sessionsForSelectedDate]);

  const missingSlotNumbers = useMemo(() => {
    const targetSlots = Number(classHours);
    if (!Number.isFinite(targetSlots) || targetSlots <= 0) return [];

    const existingSlotNumbers = new Set(
      sessionsForSelectedDate.map(session => session.slot_no || 1),
    );

    return Array.from({ length: targetSlots }, (_, index) => index + 1).filter(
      slotNo => !existingSlotNumbers.has(slotNo),
    );
  }, [classHours, sessionsForSelectedDate]);

  useEffect(() => {
    if (!isLecturer) return;

    if (sessionsForSelectedDate.length === 0) {
      setSelectedSessionId(null);
      return;
    }

    if (
      selectedSessionId
      && sessionsForSelectedDate.some(session => session.id === selectedSessionId)
    ) {
      return;
    }

    const activeSession = sessionsForSelectedDate.find(
      session => getSessionTimingState(session, clock) === "open",
    );
    const upcomingSession = sessionsForSelectedDate.find(
      session => getSessionTimingState(session, clock) === "upcoming",
    );

    setSelectedSessionId(
      (activeSession || upcomingSession || sessionsForSelectedDate[0]).id,
    );
  }, [
    clock,
    isLecturer,
    selectedSessionId,
    sessionsForSelectedDate,
    setSelectedSessionId,
  ]);

  return {
    missingSlotNumbers,
    selectedSession,
    sessionsForSelectedDate,
  };
};
