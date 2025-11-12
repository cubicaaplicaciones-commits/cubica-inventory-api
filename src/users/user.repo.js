import { query } from "../db/pool.js";

export async function findUserByEmail(email) {
  const { rows } = await query("select * from users where email=$1", [email.toLowerCase().trim()]);
  return rows[0] || null;
}

export async function createUserRepo({ email, passwordHash, fullName, active = true }) {
  const sql = `
    insert into users (email, password, full_name, active)
    values ($1, $2, $3, $4)
    returning *
  `;
  const { rows } = await query(sql, [email.toLowerCase().trim(), passwordHash, fullName || null, active]);
  return rows[0];
}

export async function addUserRole(userId, roleId) {
  await query(
    "insert into user_roles(user_id, role_id) values($1,$2) on conflict do nothing",
    [userId, roleId]
  );
}

export async function getUserRoles(userId) {
  const { rows } = await query(
    `select r.name from roles r
     join user_roles ur on ur.role_id = r.id
     where ur.user_id = $1`,
    [userId]
  );
  return rows.map(r => r.name);
}



