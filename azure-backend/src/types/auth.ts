export type AuthenticatedUser = {
  id: string;
  email?: string;
  role?: "student" | "lecturer" | "staff" | "admin";
  fullName?: string;
  faculty?: string | null;
  programme?: string | null;
  claims: Record<string, unknown>;
};
