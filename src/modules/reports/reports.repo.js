import { query } from "../../db/pool.js";

/**
 * Stock total por ítem (sumatoria en todas las bodegas).
 * Devuelve: item_id, sku, name, total_quantity, total_reserved, available
 */
export async function reportStockTotalsByItem() {
  const sql = `
    select
      i.id        as item_id,
      i.sku,
      i.name,
      coalesce(sum(s.quantity), 0) as total_quantity,
      coalesce(sum(s.reserved), 0) as total_reserved,
      coalesce(sum(s.quantity), 0) - coalesce(sum(s.reserved), 0) as available
    from items i
    left join stock_levels s on s.item_id = i.id
    where i.active = true
    group by i.id, i.sku, i.name
    order by i.name
  `;
  const { rows } = await query(sql);
  return rows;
}

/**
 * Listado de movimientos (cabecera + líneas) en un rango opcional.
 * Filtros opcionales:
 *  - type: IN|OUT|TRANSFER|ADJUST
 *  - from, to: ISO date strings o timestamps
 *  - itemId: filtra por ítem específico
 *  - warehouseId: participa como origen o destino
 *  - limit/offset: paginación
 */
export async function reportMovements({
  type,
  from,
  to,
  itemId,
  warehouseId,
  limit = 100,
  offset = 0
} = {}) {
  const where = [];
  const vals = [];
  let i = 1;

  if (type) {
    where.push(`m.type = $${i++}`);
    vals.push(String(type).toUpperCase());
  }
  if (from) {
    where.push(`m.movement_date >= $${i++}`);
    vals.push(from);
  }
  if (to) {
    where.push(`m.movement_date <= $${i++}`);
    vals.push(to);
  }
  if (itemId) {
    where.push(`ml.item_id = $${i++}`);
    vals.push(Number(itemId));
  }
  if (warehouseId) {
    where.push(`(m.origin_warehouse_id = $${i} or m.destination_warehouse_id = $${i})`);
    vals.push(Number(warehouseId));
    i++;
  }

  const lim = Math.max(1, Number(limit) || 100);
  const off = Math.max(0, Number(offset) || 0);

  const sql = `
    select
      m.id                as movement_id,
      m.type,
      m.movement_date,
      m.origin_warehouse_id,
      ow.code             as origin_code,
      ow.name             as origin_name,
      m.destination_warehouse_id,
      dw.code             as destination_code,
      dw.name             as destination_name,
      m.project_id,
      m.notes,
      ml.id               as line_id,
      ml.item_id,
      i.sku               as item_sku,
      i.name              as item_name,
      ml.quantity,
      ml.unit_cost
    from movements m
    join movement_lines ml on ml.movement_id = m.id
    join items i           on i.id = ml.item_id
    left join warehouses ow on ow.id = m.origin_warehouse_id
    left join warehouses dw on dw.id = m.destination_warehouse_id
    ${where.length ? "where " + where.join(" and ") : ""}
    order by m.movement_date desc, m.id desc, ml.id asc
    limit ${lim} offset ${off}
  `;
  const { rows } = await query(sql, vals);
  return rows;
}
