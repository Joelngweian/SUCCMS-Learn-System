import type { HttpRequest } from "@azure/functions";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { getConfig } from "./config";
import { getPool } from "./db";
import type { AuthenticatedUser } from "../types/auth";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const passwordKeyLength = 64;
const passwordScryptOptions = {
  N: 16384,
  r: 8,
  p: 1
} as const;

type UserProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  faculty: string | null;
  programme: string | null;
  is_active: boolean | null;
};

type PasswordRow = UserProfileRow & {
  password_hash: string;
  password_salt: string;
  disabled_at: Date | null;
  email_verified_at: Date | null;
  email_verification_sent_at: Date | null;
};

type StudentSignupInput = {
  email: string;
  password: string;
  username: string;
  fullName: string;
};

function getBearerToken(request: HttpRequest) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function getJwks() {
  if (jwks) return jwks;
  const { authJwksUrl } = getConfig();
  if (!authJwksUrl) {
    throw new Error("auth_verifier_not_configured");
  }
  jwks = createRemoteJWKSet(new URL(authJwksUrl));
  return jwks;
}

export async function requireUser(request: HttpRequest): Promise<AuthenticatedUser> {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error("missing_bearer_token");
  }

  const config = getConfig();
  const verifyOptions = {
    audience: config.authAudience,
    ...(config.authIssuer ? { issuer: config.authIssuer } : {})
  };
  const verified = config.authJwtSecret
    ? await jwtVerify(token, new TextEncoder().encode(config.authJwtSecret), verifyOptions)
    : await jwtVerify(token, getJwks(), verifyOptions);

  const payload = verified.payload as Record<string, unknown>;
  const id = String(payload.sub || "");
  if (!id) {
    throw new Error("missing_subject");
  }

  return {
    id,
    email: typeof payload.email === "string" ? payload.email : undefined,
    role: normalizeRole(payload.role),
    fullName: typeof payload.name === "string" ? payload.name : undefined,
    claims: payload
  };
}

export async function signUserToken(user: AuthenticatedUser) {
  const { authAudience, authIssuer, authJwtSecret } = getConfig();
  if (!authJwtSecret) {
    throw new Error("auth_signing_not_configured");
  }

  return new SignJWT({
    email: user.email,
    role: user.role,
    name: user.fullName,
    faculty: user.faculty,
    programme: user.programme
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setAudience(authAudience)
    .setIssuer(authIssuer || "succms-azure-auth")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(authJwtSecret));
}

export async function findUserByEmail(email: string): Promise<UserProfileRow | null> {
  const result = await getPool().query<UserProfileRow>(
    `
      SELECT id, email, full_name, role, faculty, programme, is_active
      FROM public.user_profiles
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [email.trim()]
  );

  return result.rows[0] || null;
}

export async function findPasswordUserByEmail(email: string): Promise<PasswordRow | null> {
  const result = await getPool().query<PasswordRow>(
    `
      SELECT
        profile.id,
        profile.email,
        profile.full_name,
        profile.role,
        profile.faculty,
        profile.programme,
        profile.is_active,
        auth_user.password_hash,
        auth_user.password_salt,
        auth_user.disabled_at,
        auth_user.email_verified_at,
        auth_user.email_verification_sent_at
      FROM public.user_profiles profile
      JOIN app_auth.users auth_user ON auth_user.user_id = profile.id
      WHERE lower(profile.email) = lower($1)
      LIMIT 1
    `,
    [email.trim()]
  );

  return result.rows[0] || null;
}

export async function setInitialPassword(email: string, password: string): Promise<AuthenticatedUser> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("user_not_found");
  }
  if (user.is_active === false) {
    throw new Error("user_disabled");
  }

  const passwordRecord = await hashPassword(password);
  await getPool().query(
    `
      INSERT INTO app_auth.users (user_id, password_hash, password_salt)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        password_salt = EXCLUDED.password_salt,
        password_set_at = now(),
        email_verified_at = COALESCE(app_auth.users.email_verified_at, now()),
        email_verification_token_hash = NULL,
        email_verification_sent_at = NULL,
        email_verification_expires_at = NULL,
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = now()
    `,
    [user.id, passwordRecord.hash, passwordRecord.salt]
  );

  return toAuthenticatedUser(user);
}

export async function createStudentAccount(input: StudentSignupInput): Promise<AuthenticatedUser> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  const fullName = input.fullName.trim();

  if (!isStudentEmail(email)) {
    throw new Error("invalid_student_email");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const existingEmail = await client.query(
      `
        SELECT id
        FROM public.user_profiles
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      [email]
    );
    if (existingEmail.rows.length > 0) {
      throw new Error("email_already_registered");
    }

    const existingUsername = await client.query(
      `
        SELECT id
        FROM public.user_profiles
        WHERE lower(username) = lower($1)
        LIMIT 1
      `,
      [username]
    );
    if (existingUsername.rows.length > 0) {
      throw new Error("username_already_registered");
    }

    const id = randomUUID();
    const passwordRecord = await hashPassword(input.password);
    const insertedProfile = await client.query<UserProfileRow>(
      `
        INSERT INTO public.user_profiles (
          id,
          email,
          full_name,
          username,
          role,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'student', true, now(), now())
        RETURNING id, email, full_name, role, faculty, programme, is_active
      `,
      [id, email, fullName, username]
    );

    await client.query(
      `
        INSERT INTO app_auth.users (user_id, password_hash, password_salt)
        VALUES ($1, $2, $3)
      `,
      [id, passwordRecord.hash, passwordRecord.salt]
    );

    await client.query("COMMIT");
    return toAuthenticatedUser(insertedProfile.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUserPassword(userId: string, password: string) {
  const passwordRecord = await hashPassword(password);
  const result = await getPool().query(
    `
      UPDATE app_auth.users
      SET password_hash = $2,
          password_salt = $3,
          password_set_at = now(),
          failed_login_count = 0,
          locked_until = NULL,
          updated_at = now()
      WHERE user_id = $1
      RETURNING user_id
    `,
    [userId, passwordRecord.hash, passwordRecord.salt]
  );

  if (result.rowCount === 0) {
    throw new Error("auth_user_not_found");
  }
}

export async function authenticatePassword(email: string, password: string): Promise<AuthenticatedUser> {
  const user = await findPasswordUserByEmail(email);
  if (!user || user.disabled_at || user.is_active === false) {
    throw new Error("invalid_credentials");
  }

  if (!user.email_verified_at && user.email_verification_sent_at) {
    throw new Error("email_not_verified");
  }

  const valid = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!valid) {
    await recordFailedLogin(email);
    throw new Error("invalid_credentials");
  }

  await getPool().query(
    `
      UPDATE app_auth.users
      SET failed_login_count = 0,
          locked_until = NULL,
          last_login_at = now(),
          updated_at = now()
      WHERE user_id = $1
    `,
    [user.id]
  );

  await getPool().query(
    `
      UPDATE public.user_profiles
      SET last_login_at = now(),
          updated_at = now()
      WHERE id = $1
    `,
    [user.id]
  );

  return toAuthenticatedUser(user);
}

function toAuthenticatedUser(user: UserProfileRow): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    role: normalizeRole(user.role),
    fullName: user.full_name,
    faculty: user.faculty,
    programme: user.programme,
    claims: {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
      faculty: user.faculty,
      programme: user.programme
    }
  };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = scryptSync(password, salt, passwordKeyLength, passwordScryptOptions);
  return {
    hash: derived.toString("base64url"),
    salt
  };
}

async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const expected = Buffer.from(expectedHash, "base64url");
  const actual = scryptSync(password, salt, expected.length, passwordScryptOptions);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

async function recordFailedLogin(email: string) {
  await getPool().query(
    `
      UPDATE app_auth.users auth_user
      SET failed_login_count = failed_login_count + 1,
          updated_at = now()
      FROM public.user_profiles profile
      WHERE auth_user.user_id = profile.id
        AND lower(profile.email) = lower($1)
    `,
    [email.trim()]
  );
}

function normalizeRole(value: unknown): AuthenticatedUser["role"] | undefined {
  if (value === "student" || value === "lecturer" || value === "staff" || value === "admin") {
    return value;
  }
  return undefined;
}

function isStudentEmail(email: string) {
  if (!email.endsWith("@sc.edu.my")) return false;
  const prefix = email.slice(0, -"@sc.edu.my".length);
  return prefix.startsWith("d") || prefix.startsWith("b") || prefix.startsWith("p");
}
