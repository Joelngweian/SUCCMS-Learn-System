const splitStudySessionDateTimeValue = (value: string) => {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
};

export const combineStudySessionDateTimeValue = (date: string, time: string) =>
  date || time ? `${date}T${time}` : "";

export const hasCompleteStudySessionDateTimeValue = (value: string) => {
  const { date, time } = splitStudySessionDateTimeValue(value);
  return Boolean(date && time);
};

export const getStudySessionDateTimeParts = splitStudySessionDateTimeValue;
