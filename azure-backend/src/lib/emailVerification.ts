import { createHash, randomBytes } from "node:crypto";
import { getConfig } from "./config";
import { getPool } from "./db";

const verificationTokenBytes = 32;
const verificationExpiryHours = 24;

type VerificationEmailInput = {
  email: string;
  fullName?: string;
  verificationUrl: string;
};

type VerificationEmailResult = {
  delivered: boolean;
  provider: "sendgrid" | "none";
};

export function createVerificationUrl(baseUrl: string, token: string) {
  const url = new URL("/api/auth/verify-email", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function createEmailVerification(userId: string) {
  const token = randomBytes(verificationTokenBytes).toString("base64url");
  const tokenHash = hashVerificationToken(token);

  const result = await getPool().query<{ expires_at: Date }>(
    `
      UPDATE app_auth.users
      SET email_verification_token_hash = $2,
          email_verification_sent_at = now(),
          email_verification_expires_at = now() + ($3 || ' hours')::interval,
          updated_at = now()
      WHERE user_id = $1
      RETURNING email_verification_expires_at AS expires_at
    `,
    [userId, tokenHash, verificationExpiryHours]
  );

  if (result.rowCount === 0) {
    throw new Error("auth_user_not_found");
  }

  return {
    token,
    expiresAt: result.rows[0].expires_at
  };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashVerificationToken(token);
  const result = await getPool().query<{ user_id: string }>(
    `
      UPDATE app_auth.users
      SET email_verified_at = now(),
          email_verification_token_hash = NULL,
          email_verification_sent_at = NULL,
          email_verification_expires_at = NULL,
          failed_login_count = 0,
          locked_until = NULL,
          updated_at = now()
      WHERE email_verification_token_hash = $1
        AND email_verification_expires_at > now()
        AND disabled_at IS NULL
      RETURNING user_id
    `,
    [tokenHash]
  );

  if (result.rowCount === 0) {
    throw new Error("invalid_verification_token");
  }

  return result.rows[0].user_id;
}

export async function sendVerificationEmail(
  input: VerificationEmailInput
): Promise<VerificationEmailResult> {
  const config = getConfig();

  if (!config.sendgridApiKey || !config.emailFrom) {
    return { delivered: false, provider: "none" };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.sendgridApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: input.email, name: input.fullName || input.email }]
        }
      ],
      from: {
        email: config.emailFrom,
        ...(config.emailFromName ? { name: config.emailFromName } : {})
      },
      subject: "Confirm your SUCCMS Learn email",
      content: [
        {
          type: "text/plain",
          value: [
            `Hi ${input.fullName || "there"},`,
            "",
            "Please confirm your SUCCMS Learn account email by opening this link:",
            input.verificationUrl,
            "",
            "This link expires in 24 hours."
          ].join("\n")
        },
        {
          type: "text/html",
          value: [
            `<p>Hi ${escapeHtml(input.fullName || "there")},</p>`,
            "<p>Please confirm your SUCCMS Learn account email by opening this link:</p>",
            `<p><a href="${escapeHtml(input.verificationUrl)}">Confirm email</a></p>`,
            "<p>This link expires in 24 hours.</p>"
          ].join("")
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`sendgrid_email_failed:${response.status}`);
  }

  return { delivered: true, provider: "sendgrid" };
}

function hashVerificationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
