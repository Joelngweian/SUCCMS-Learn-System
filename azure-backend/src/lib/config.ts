import { z } from "zod";

const configSchema = z.object({
  databaseUrl: z.string().min(1),
  databaseSslRejectUnauthorized: z.boolean().default(false),
  authJwksUrl: z.string().url().optional(),
  authAudience: z.string().min(1),
  authIssuer: z.string().url().optional(),
  authJwtSecret: z.string().min(32).optional(),
  authBootstrapKey: z.string().min(16).optional(),
  azureStorageAccountName: z.string().min(1),
  azureStorageAccountKey: z.string().min(1),
  azureStorageContainer: z.string().min(1).default("succms-files"),
  azureSignalRConnectionString: z.string().min(1).optional(),
  acsConnectionString: z.string().min(1).optional(),
  emailFrom: z.string().email().optional(),
  emailFromName: z.string().min(1).optional(),
  sendgridApiKey: z.string().min(1).optional(),
  geminiApiKey: z.string().min(1),
  geminiModel: z.string().min(1).default("gemini-2.5-flash")
});

export type AppConfig = z.infer<typeof configSchema>;

let cachedConfig: AppConfig | null = null;

export function getConfig() {
  if (cachedConfig) return cachedConfig;

  cachedConfig = configSchema.parse({
    databaseUrl: process.env.DATABASE_URL,
    databaseSslRejectUnauthorized:
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
    authJwksUrl: process.env.AUTH_JWKS_URL || undefined,
    authAudience: process.env.AUTH_AUDIENCE,
    authIssuer: process.env.AUTH_ISSUER || undefined,
    authJwtSecret: process.env.AUTH_JWT_SECRET || undefined,
    authBootstrapKey: process.env.AUTH_BOOTSTRAP_KEY || undefined,
    azureStorageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    azureStorageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER || "succms-files",
    azureSignalRConnectionString: process.env.AZURE_SIGNALR_CONNECTION_STRING || undefined,
    acsConnectionString: process.env.ACS_CONNECTION_STRING || undefined,
    emailFrom: process.env.EMAIL_FROM || undefined,
    emailFromName: process.env.EMAIL_FROM_NAME || undefined,
    sendgridApiKey: process.env.SENDGRID_API_KEY || undefined,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash"
  });

  return cachedConfig;
}
