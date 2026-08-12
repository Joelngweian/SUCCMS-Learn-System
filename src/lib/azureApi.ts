const AZURE_API_URL = import.meta.env.VITE_AZURE_API_URL?.replace(/\/+$/, "") || "";
const AZURE_AUTH_STORAGE_KEY = "succms.azureAuthSession";

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error?: { message?: string; code?: string; details?: unknown } };

export type AzureAuthUser = {
  id: string;
  email: string;
  role: "student" | "lecturer" | "staff" | "admin";
  fullName: string;
  faculty?: string | null;
  programme?: string | null;
};

export type AzureAuthSession = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  expiresAt: number;
  user: AzureAuthUser;
};

type AzureAuthResponse = Omit<AzureAuthSession, "expiresAt">;

export type AzureSignupVerificationResponse = {
  requiresEmailVerification: true;
  email: string;
  emailDelivered: boolean;
  verificationExpiresAt?: string;
  verificationUrl?: string;
};

const getAzureApiUrl = () => {
  if (!AZURE_API_URL) {
    throw new Error("Azure API URL is not configured.");
  }
  return AZURE_API_URL;
};

const parseEnvelope = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !body?.ok) {
    const message =
      body && "error" in body && body.error?.message
        ? body.error.message
        : `Azure API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body.data;
};

export const azureApiFetch = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(init.headers);
  const session = azureAuth.loadSession();
  if (session?.accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${session.accessToken}`);
  }
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${getAzureApiUrl()}${path}`, {
    ...init,
    headers,
  });

  return parseEnvelope<T>(response);
};

const buildSession = (data: AzureAuthResponse): AzureAuthSession => ({
  ...data,
  expiresAt: Date.now() + data.expiresInSeconds * 1000,
});

export const isAzureAuthEnabled = () =>
  true;

export const azureAuth = {
  async signup(
    email: string,
    password: string,
    username: string,
    fullName: string,
  ): Promise<AzureSignupVerificationResponse> {
    const response = await fetch(`${getAzureApiUrl()}/api/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, username, fullName }),
    });

    return parseEnvelope<AzureSignupVerificationResponse>(response);
  },

  async login(email: string, password: string): Promise<AzureAuthSession> {
    const response = await fetch(`${getAzureApiUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    return buildSession(await parseEnvelope<AzureAuthResponse>(response));
  },

  async me(accessToken: string): Promise<AzureAuthUser> {
    const response = await fetch(`${getAzureApiUrl()}/api/auth/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    return parseEnvelope<AzureAuthUser>(response);
  },

  saveSession(session: AzureAuthSession) {
    localStorage.setItem(AZURE_AUTH_STORAGE_KEY, JSON.stringify(session));
  },

  loadSession(): AzureAuthSession | null {
    const rawSession = localStorage.getItem(AZURE_AUTH_STORAGE_KEY);
    if (!rawSession) return null;

    try {
      const session = JSON.parse(rawSession) as AzureAuthSession;
      if (!session.accessToken || !session.user?.id || session.expiresAt <= Date.now()) {
        localStorage.removeItem(AZURE_AUTH_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(AZURE_AUTH_STORAGE_KEY);
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(AZURE_AUTH_STORAGE_KEY);
  },
};
