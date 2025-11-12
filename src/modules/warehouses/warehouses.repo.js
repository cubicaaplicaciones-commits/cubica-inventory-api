import { query } from "../../db/pool.js";

export async function createWarehouse({ code, name, address = null, city = null }) {
  const sql = `
    insert into warehouses (code, name, address, city, active)
    values ($1, $2, $3, $4, true)
    returning *
  `;
  const params = [code, name, address, city];
  const { rows } = await query(sql, params);
  return rows[0];
}

export async function findAllWarehouses() {
  const sql = `select * from warehouses order by id desc`;
  const { rows } = await query(sql);
  return rows;
}

export async function findWarehouseById(id) {
  const sql = `select * from warehouses where id = $1`;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

export async function findWarehouseByCode(code) {
  const sql = `select * from warehouses where code = $1`;
  const { rows } = await query(sql, [code]);
  return rows[0] || null;
}

export async function updateWarehouse(id, patch) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = $${idx++}`);
    values.push(v);
  }

  if (fields.length === 0) return findWarehouseById(id);

  values.push(id);
  const sql = `
    update warehouses
       set ${fields.join(", ")}, updated_at = now()
     where id = $${idx}
   returning *
  `;
  const { rows } = await query(sql, values);
  return rows[0] || null;
}

export async function deleteWarehouseLogical(id) {
  const sql = `
    update warehouses
       set active = false, updated_at = now()
     where id = $1
   returning *
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

export async function searchWarehousesByTerm(q) {
  const term = `%${q}%`;
  const sql = `
    select *
      from warehouses
     where code ilike $1
        or name ilike $1
     order by name
  `;
  const { rows } = await query(sql, [term]);
  return rows;
}
