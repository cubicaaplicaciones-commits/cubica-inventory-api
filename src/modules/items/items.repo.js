import { query } from "../../db/pool.js";

export async function createItem({ sku, name, description, unit, min_stock = 0, photo_url = null }) {
  const sql = `
    insert into items (sku, name, description, unit, min_stock, photo_url, active)
    values ($1, $2, $3, $4, $5, $6, true)
    returning *
  `;
  const params = [sku, name, description, unit, min_stock, photo_url];
  const { rows } = await query(sql, params);
  return rows[0];
}

export async function findAllItems() {
  const sql = `select * from items order by id desc`;
  const { rows } = await query(sql);
  return rows;
}

export async function findItemById(id) {
  const sql = `select * from items where id=$1`;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

export async function findItemBySku(sku) {
  const sql = `select * from items where sku=$1`;
  const { rows } = await query(sql, [sku]);
  return rows[0] || null;
}

export async function updateItem(id, patch) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k}=$${idx++}`);
    values.push(v);
  }
  if (fields.length === 0) return findItemById(id);
  values.push(id);
  const sql = `update items set ${fields.join(", ")}, updated_at=now() where id=$${idx} returning *`;
  const { rows } = await query(sql, values);
  return rows[0] || null;
}

export async function deleteItemLogical(id) {
  const sql = `update items set active=false, updated_at=now() where id=$1 returning *`;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

export async function searchItemsByName(q) {
  const sql = `select * from items where name ilike $1 order by name`;
  const { rows } = await query(sql, [`%${q}%`]);
  return rows;
}



