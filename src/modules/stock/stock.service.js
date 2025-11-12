import { z } from "zod";
import {
  getStock,
  listStockByItem,
  listStockByWarehouse,
  upsertStockDelta,
  updateReservedDelta
} from "./stock.repo.js";

const idSchema = z.coerce.number().int().positive();
const deltaSchema = z.coerce.number().refine(n => n !== 0, { message: "delta no puede ser 0" });

const getSchema = z.object({
  itemId: idSchema,
  warehouseId: idSchema
});

const listByItemSchema = z.object({
  itemId: idSchema
});

const listByWarehouseSchema = z.object({
  warehouseId: idSchema
});

const upsertSchema = z.object({
  itemId: idSchema,
  warehouseId: idSchema,
  delta: deltaSchema
});

const reserveSchema = z.object({
  itemId: idSchema,
  warehouseId: idSchema,
  reservedDelta: z.coerce.number().refine(() => true) // permite positivo o negativo; validaciones de rango en repo
});

function norm(s) {
  return typeof s === "string" ? s.trim() : s;
}

export async function getStockSvc(input) {
  const { itemId, warehouseId } = getSchema.parse(input);
  const row = await getStock(itemId, warehouseId);
  if (!row) throw new Error("Stock no encontrado");
  return row;
}

export async function listByItemSvc(input) {
  const { itemId } = listByItemSchema.parse(input);
  return listStockByItem(itemId);
}

export async function listByWarehouseSvc(input) {
  const { warehouseId } = listByWarehouseSchema.parse(input);
  return listStockByWarehouse(warehouseId);
}

export async function upsertDeltaSvc(input) {
  const data = upsertSchema.parse({
    itemId: norm(input.itemId),
    warehouseId: norm(input.warehouseId),
    delta: norm(input.delta)
  });
  return upsertStockDelta(data.itemId, data.warehouseId, data.delta);
}

export async function updateReservedSvc(input) {
  const data = reserveSchema.parse({
    itemId: norm(input.itemId),
    warehouseId: norm(input.warehouseId),
    reservedDelta: norm(input.reservedDelta)
  });
  return updateReservedDelta(data.itemId, data.warehouseId, data.reservedDelta);
}
