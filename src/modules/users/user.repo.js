import { query } from "../../db/pool.js";


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
