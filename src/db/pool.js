import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootEnvPath = join(__dirname, "../../.env");
config({ path: rootEnvPath });

const { Pool } = pg;

const ssl =
  process.env.PGSSLMODE === "require"
    ? { rejectUnauthorized: false }
    : false;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  // ⬇️ timeouts para no colgar
  connectionTimeoutMillis: 4000,   // 4s para conseguir conexión
  idleTimeoutMillis: 10000         // 10s idle
});


export const query = (text, params) => pool.query(text, params);

export async function ping() {
  const { rows } = await pool.query("select 1 as ok");
  return rows[0]?.ok === 1;
}

process.on("SIGINT", async () => {
  try { await pool.end(); } finally { process.exit(0); }
});



