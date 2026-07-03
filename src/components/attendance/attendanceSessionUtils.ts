export const getLocalDateValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export const getLocalTimeValue = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
};

export const generateCheckInCode = () => {
  const characters = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, value => characters[value % characters.length]).join(
    "",
  );
};
