import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { pool } from "./pool.js";

config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@cubica.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function ensureRole(name) {
  const r = await pool.query("select id from roles where name=$1", [name]);
  if (r.rowCount) return r.rows[0].id;
  const ins = await pool.query(
    "insert into roles(name) values($1) returning id",
    [name]
  );
  return ins.rows[0].id;
}

async function ensureAdmin(email, password, roleIds) {
  const r = await pool.query("select id from users where email=$1", [email]);
  if (r.rowCount) return r.rows[0].id;
  const hash = await bcrypt.hash(password, 10);
  const ins = await pool.query(
    "insert into users(email,password,full_name,active) values($1,$2,$3,true) returning id",
    [email, hash, "Administrador"]
  );
  const userId = ins.rows[0].id;
  for (const roleId of roleIds) {
    await pool.query(
      "insert into user_roles(user_id, role_id) values($1,$2) on conflict do nothing",
      [userId, roleId]
    );
  }
  return userId;
}

async function run() {
  const adminId = await ensureRole("ADMIN");
  const userId = await ensureRole("USER");
  await ensureAdmin(ADMIN_EMAIL, ADMIN_PASSWORD, [adminId, userId]);
  console.log("Seed completed");
  await pool.end();
}

run().catch(async (err) => {
  console.error("Seed error:", err.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});



