import { pool } from "../../db/pool.js";

/**
 * Reglas:
 * - IN:        requiere destination_warehouse_id. Suma quantity en destino.
 * - OUT:       requiere origin_warehouse_id.     Resta quantity en origen (no permite negativo).
 * - TRANSFER:  requiere origin_warehouse_id y destination_warehouse_id. Resta en origen y suma en destino (misma tx).
 * - ADJUST:    requiere warehouse; usaremos destination_warehouse_id como bodega objetivo (puede ser positiva o negativa).
 *
 * Notas:
 * - Todas las operaciones se realizan en una sola transacción.
 * - Se bloquean filas de stock con SELECT ... FOR UPDATE para evitar carreras.
 * - Si no existe stock_levels para (item, warehouse), se crea con quantity=0 antes de aplicar el delta.
 */

async function selectStockForUpdate(client, itemId, warehouseId) {
  const sel = await client.query(
    `select id, quantity, reserved
       from stock_levels
      where item_id = $1 and warehouse_id = $2
      for update`,
    [itemId, warehouseId]
  );
  if (sel.rowCount === 0) {
    const ins = await client.query(
      `insert into stock_levels (item_id, warehouse_id, quantity, reserved)
       values ($1, $2, 0, 0)
       returning id, quantity, reserved`,
      [itemId, warehouseId]
    );
    return ins.rows[0];
  }
  return sel.rows[0];
}

async function applyDeltaOnWarehouse(client, itemId, warehouseId, delta) {
  const row = await selectStockForUpdate(client, itemId, warehouseId);
  const current = Number(row.quantity);
  const next = current + Number(delta);
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
  return upd.rows[0];
}

/**
 * Crea un movimiento y sus líneas, aplicando las actualizaciones de stock correspondientes.
 *
 * @param {Object} input
 * @param {'IN'|'OUT'|'TRANSFER'|'ADJUST'} input.type
 * @param {string|Date} [input.movement_date]  // opcional; default now() en BD si no se provee
 * @param {number|null} [input.origin_warehouse_id]
 * @param {number|null} [input.destination_warehouse_id]
 * @param {number|null} [input.project_id]
 * @param {string|null} [input.notes]
 * @param {Array<{item_id:number, quantity:number, unit_cost?:number}>} input.lines
 */
export async function createMovementRepo(input) {
  const {
    type,
    movement_date = null,
    origin_warehouse_id = null,
    destination_warehouse_id = null,
    project_id = null,
    notes = null,
    lines = []
  } = input;

  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("El movimiento requiere al menos una línea");
  }
  const upperType = String(type || "").toUpperCase();
  if (!["IN", "OUT", "TRANSFER", "ADJUST"].includes(upperType)) {
    throw new Error("Tipo de movimiento inválido");
  }

  // Validaciones mínimas por tipo
  if (upperType === "IN" && !destination_warehouse_id) {
    throw new Error("IN requiere destination_warehouse_id");
  }
  if (upperType === "OUT" && !origin_warehouse_id) {
    throw new Error("OUT requiere origin_warehouse_id");
  }
  if (upperType === "TRANSFER" && (!origin_warehouse_id || !destination_warehouse_id)) {
    throw new Error("TRANSFER requiere origin_warehouse_id y destination_warehouse_id");
  }
  if (upperType === "ADJUST" && !destination_warehouse_id) {
    // Usamos destination como bodega objetivo de ajuste
    throw new Error("ADJUST requiere destination_warehouse_id");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert cabecera
    const insMov = await client.query(
      `insert into movements (type, movement_date, origin_warehouse_id, destination_warehouse_id, project_id, notes)
       values ($1, coalesce($2, now()), $3, $4, $5, $6)
       returning *`,
      [upperType, movement_date, origin_warehouse_id, destination_warehouse_id, project_id, notes]
    );
    const movement = insMov.rows[0];

    // Procesar líneas y actualizar stock según tipo
    const resultLines = [];
    for (const ln of lines) {
      const itemId = Number(ln.item_id);
      const qty = Number(ln.quantity);
      const unitCost = Number(ln.unit_cost || 0);

      if (!Number.isFinite(itemId) || itemId <= 0) {
        throw new Error("item_id inválido en una de las líneas");
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error("quantity debe ser > 0 en todas las líneas");
      }

      // Insert línea
      const insLine = await client.query(
        `insert into movement_lines (movement_id, item_id, quantity, unit_cost)
         values ($1, $2, $3, $4)
         returning *`,
        [movement.id, itemId, qty, unitCost]
      );
      resultLines.push(insLine.rows[0]);

      // Aplica deltas de stock
      if (upperType === "IN") {
        await applyDeltaOnWarehouse(client, itemId, destination_warehouse_id, +qty);
      } else if (upperType === "OUT") {
        await applyDeltaOnWarehouse(client, itemId, origin_warehouse_id, -qty);
      } else if (upperType === "TRANSFER") {
        await applyDeltaOnWarehouse(client, itemId, origin_warehouse_id, -qty);
        await applyDeltaOnWarehouse(client, itemId, destination_warehouse_id, +qty);
      } else if (upperType === "ADJUST") {
        // Ajuste sobre destination_warehouse_id: qty puede ser positiva (suma) o negativa (resta)
        await applyDeltaOnWarehouse(client, itemId, destination_warehouse_id, qty);
      }
    }

    await client.query("COMMIT");
    return { movement, lines: resultLines };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function getMovementByIdRepo(id) {
  const client = await pool.connect();
  try {
    const mov = await client.query(`select * from movements where id = $1`, [id]);
    if (mov.rowCount === 0) return null;
    const movement = mov.rows[0];
    const lines = await client.query(
      `select * from movement_lines where movement_id = $1 order by id`,
      [id]
    );
    return { movement, lines: lines.rows };
  } finally {
    client.release();
  }
}

/**
 * Lista movimientos con filtros opcionales.
 * @param {{ type?:string, from?:string|Date, to?:string|Date, warehouseId?:number, limit?:number, offset?:number }} params
 */
export async function listMovementsRepo(params = {}) {
  const where = [];
  const values = [];
  let i = 1;

  if (params.type) {
    where.push(`type = $${i++}`);
    values.push(String(params.type).toUpperCase());
  }
  if (params.from) {
    where.push(`movement_date >= $${i++}`);
    values.push(params.from);
  }
  if (params.to) {
    where.push(`movement_date <= $${i++}`);
    values.push(params.to);
  }
  if (params.warehouseId) {
    // filtra si participa como origen o destino
    where.push(`(origin_warehouse_id = $${i} or destination_warehouse_id = $${i})`);
    values.push(Number(params.warehouseId));
    i++;
  }

  const lim = Number.isFinite(Number(params.limit)) ? Math.max(1, Number(params.limit)) : 50;
  const off = Number.isFinite(Number(params.offset)) ? Math.max(0, Number(params.offset)) : 0;

  const sql = `
    select *
      from movements
     ${where.length ? "where " + where.join(" and ") : ""}
     order by movement_date desc, id desc
     limit ${lim} offset ${off}
  `;
  const { rows } = await pool.query(sql, values);
  return rows;
}
