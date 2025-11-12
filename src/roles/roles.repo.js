import { query } from "../db/pool.js";

export async function findRoleByName(name) {
  const { rows } = await query("select * from roles where name=$1", [name.toUpperCase().trim()]);
  return rows[0] || null;
}



