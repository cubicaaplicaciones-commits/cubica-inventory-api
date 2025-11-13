// src/modules/users/user.repo.js (ruta de ejemplo)
import { query } from "../../db/pool.js";

/* Busca usuario por email */
export async function findUserByEmail(email) {
  const { rows } = await query(
    "select * from users where email=$1",
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

/* Crea usuario */
export async function createUserRepo({ email, passwordHash, fullName, active = true }) {
  const sql = `
    insert into users (email, password, full_name, active)
    values ($1, $2, $3, $4)
    returning *
  `;
  const { rows } = await query(sql, [
    email.toLowerCase().trim(),
    passwordHash,
    fullName || null,
    active
  ]);
  return rows[0];
}

/* Asigna rol a usuario (si no existe, no duplica) */
export async function addUserRole(userId, roleId) {
  await query(
    "insert into user_roles(user_id, role_id) values($1,$2) on conflict do nothing",
    [userId, roleId]
  );
}

/* Obtiene nombres de roles de un usuario */
export async function getUserRoles(userId) {
  const { rows } = await query(
    `select r.name
       from roles r
       join user_roles ur on ur.role_id = r.id
      where ur.user_id = $1`,
    [userId]
  );
  return rows.map((r) => r.name);
}

/* Obtiene usuario por ID */
export async function findUserById(id) {
  const { rows } = await query("select * from users where id=$1", [id]);
  return rows[0] || null;
}

/* Lista todos los usuarios */
export async function listUsersRepo() {
  const { rows } = await query("select * from users order by id asc");
  return rows;
}

/* Actualiza campos básicos del usuario */
export async function updateUserRepo(id, { email, passwordHash, fullName, active }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (email !== undefined) {
    fields.push(`email=$${idx++}`);
    values.push(email.toLowerCase().trim());
  }
  if (passwordHash !== undefined) {
    fields.push(`password=$${idx++}`);
    values.push(passwordHash);
  }
  if (fullName !== undefined) {
    fields.push(`full_name=$${idx++}`);
    values.push(fullName || null);
  }
  if (active !== undefined) {
    fields.push(`active=$${idx++}`);
    values.push(active);
  }

  values.push(id);
  const sql = `update users set ${fields.join(", ")} where id=$${idx} returning *`;
  const { rows } = await query(sql, values);
  return rows[0];
}

/* Desactiva usuario (soft delete) */
export async function setUserActiveRepo(id, active) {
  const { rows } = await query(
    "update users set active=$1 where id=$2 returning *",
    [active, id]
  );
  return rows[0];
}

/* Borra todos los roles de un usuario */
export async function clearUserRolesRepo(userId) {
  await query("delete from user_roles where user_id=$1", [userId]);
}
