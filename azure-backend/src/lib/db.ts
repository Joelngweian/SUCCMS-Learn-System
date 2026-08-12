import { Pool } from "pg";
import { getConfig } from "./config";

let pool: Pool | null = null;

export function getPool() {
  if (pool) return pool;

  const config = getConfig();
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: {
      rejectUnauthorized: config.databaseSslRejectUnauthorized
    }
  });

  return pool;
}
