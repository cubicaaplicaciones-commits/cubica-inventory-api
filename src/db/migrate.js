import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import { pool } from "./pool.js";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const sql = readFileSync(join(__dirname, "migrate.sql"), "utf8");
  await pool.query(sql);
  console.log("Migrations applied");
  await pool.end();
}

run().catch(async (err) => {
  console.error("Migration error:", err.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});



