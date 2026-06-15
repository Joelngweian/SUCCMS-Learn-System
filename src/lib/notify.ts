import { toast } from "sonner";

const getMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
};

export const notify = {
  error(error: unknown, fallback = "Something went wrong.") {
    toast.error(getMessage(error, fallback));
  },
  info(message: string) {
    toast.info(message);
  },
  success(message: string) {
    toast.success(message);
  },
  warning(message: string) {
    toast.warning(message);
  },
};

export { getMessage as getNotifyMessage };
