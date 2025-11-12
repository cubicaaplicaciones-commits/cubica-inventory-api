import { pool, query } from "../../db/pool.js";

/**
 * Devuelve el registro de stock (o null) para item y warehouse.
 */
export async function getStock(itemId, warehouseId) {
  const sql = `
    select *
      from stock_levels
     where item_id = $1 and warehouse_id = $2
  `;
  const { rows } = await query(sql, [itemId, warehouseId]);
  return rows[0] || null;
}

/**
 * Lista el stock para un item en todos los almacenes.
 */
export async function listStockByItem(itemId) {
  const sql = `
    select *
      from stock_levels
     where item_id = $1
     order by warehouse_id
  `;
  const { rows } = await query(sql, [itemId]);
  return rows;
}

/**
 * Lista el stock de un almacén para todos los items.
 */
export async function listStockByWarehouse(warehouseId) {
  const sql = `
    select *
      from stock_levels
     where warehouse_id = $1
     order by item_id
  `;
  const { rows } = await query(sql, [warehouseId]);
  return rows;
}

/**
 * Aumenta o reduce el stock (delta puede ser negativo).
 * Si no existe el registro, lo crea con quantity = max(delta, 0).
 * No permite dejar quantity en negativo.
 * Retorna la fila resultante.
 */
export async function upsertStockDelta(itemId, warehouseId, delta) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Bloquea la fila (si existe) para evitar condiciones de carrera.
    const sel = await client.query(
      `select id, quantity
         from stock_levels
        where item_id = $1 and warehouse_id = $2
        for update`,
      [itemId, warehouseId]
    );

    if (sel.rowCount === 0) {
      const initial = Math.max(0, Number(delta || 0));
      const ins = await client.query(
        `insert into stock_levels (item_id, warehouse_id, quantity, reserved)
         values ($1, $2, $3, 0)
         returning *`,
        [itemId, warehouseId, initial]
      );
      await client.query("COMMIT");
      return ins.rows[0];
    }

    const current = Number(sel.rows[0].quantity);
    const next = current + Number(delta || 0);
    if (next < 0) {
      throw new Error("Stock insuficiente");
    }

    const upd = await client.query(
      `update stock_levels
          set quantity = $1,
              updated_at = now()
        where item_id = $2 and warehouse_id = $3
      returning *`,
      [next, itemId, warehouseId]
    );

    await client.query("COMMIT");
    return upd.rows[0];
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Ajusta en delta la columna reserved. Puede ser negativo para liberar.
 * No permite que reserved quede negativa ni que reserved supere quantity.
 * Retorna la fila resultante.
 */
export async function updateReservedDelta(itemId, warehouseId, reservedDelta) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sel = await client.query(
      `select id, quantity, reserved
         from stock_levels
        where item_id = $1 and warehouse_id = $2
        for update`,
      [itemId, warehouseId]
    );

    if (sel.rowCount === 0) {
      throw new Error("No existe registro de stock para reservar");
    }

    const currentQty = Number(sel.rows[0].quantity);
    const currentRes = Number(sel.rows[0].reserved);
    const nextRes = currentRes + Number(reservedDelta || 0);

    if (nextRes < 0) throw new Error("Reserva no puede ser negativa");
    if (nextRes > currentQty) throw new Error("Reserva excede la cantidad disponible");

    const upd = await client.query(
      `update stock_levels
          set reserved = $1,
              updated_at = now()
        where item_id = $2 and warehouse_id = $3
      returning *`,
      [nextRes, itemId, warehouseId]
    );

    await client.query("COMMIT");
    return upd.rows[0];
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
