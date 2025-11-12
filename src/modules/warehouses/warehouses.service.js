import { z } from "zod";
import {
  createWarehouse,
  findAllWarehouses,
  findWarehouseById,
  findWarehouseByCode,
  updateWarehouse,
  deleteWarehouseLogical,
  searchWarehousesByTerm
} from "./warehouses.repo.js";

const createSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(160),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(120).optional().nullable()
});

const updateSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(160).optional(),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  active: z.boolean().optional()
});

function norm(s) {
  return typeof s === "string" ? s.trim() : s;
}

function normalizePayload(p) {
  const q = { ...p };
  if ("code" in q && q.code != null) q.code = norm(q.code);
  if ("name" in q && q.name != null) q.name = norm(q.name);
  if ("address" in q && q.address != null) q.address = norm(q.address);
  if ("city" in q && q.city != null) q.city = norm(q.city);
  return q;
}

export async function createWarehouseSvc(input) {
  const data = createSchema.parse(normalizePayload(input));
  const exists = await findWarehouseByCode(data.code);
  if (exists) throw new Error("Código de almacén ya existe");
  return createWarehouse(data);
}

export async function updateWarehouseSvc(id, patch) {
  const current = await findWarehouseById(id);
  if (!current) throw new Error("Almacén no encontrado");

  const data = updateSchema.parse(normalizePayload(patch));

  if (data.code && data.code !== current.code) {
    const exists = await findWarehouseByCode(data.code);
    if (exists) throw new Error("Código de almacén ya existe");
  }

  return updateWarehouse(id, data);
}

export async function getWarehouseByIdSvc(id) {
  const wh = await findWarehouseById(id);
  if (!wh) throw new Error("Almacén no encontrado");
  return wh;
}

export async function listWarehousesSvc() {
  return findAllWarehouses();
}

export async function searchWarehousesSvc(q) {
  const s = norm(q || "");
  if (!s) return [];
  return searchWarehousesByTerm(s);
}

export async function deleteWarehouseLogicalSvc(id) {
  const wh = await deleteWarehouseLogical(id);
  if (!wh) throw new Error("Almacén no encontrado");
  return wh;
}
