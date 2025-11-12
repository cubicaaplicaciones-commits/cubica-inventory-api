import { z } from "zod";
import {
  createItem,
  findAllItems,
  findItemById,
  findItemBySku,
  updateItem,
  deleteItemLogical,
  searchItemsByName
} from "../items/items.repo.js";

// Esquemas
const createSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  unit: z.string().min(1).max(16),
  min_stock: z.coerce.number().nonnegative().optional().default(0),
  photo_url: z.string().url().max(500).optional().nullable()
});

const updateSchema = z.object({
  sku: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional().nullable(),
  unit: z.string().min(1).max(16).optional(),
  min_stock: z.coerce.number().nonnegative().optional(),
  photo_url: z.string().url().max(500).optional().nullable(),
  active: z.boolean().optional()
});

// Helpers
function norm(s) {
  return typeof s === "string" ? s.trim() : s;
}

function normalizeItemPayload(p) {
  const q = { ...p };
  if ("sku" in q && q.sku != null) q.sku = norm(q.sku);
  if ("name" in q && q.name != null) q.name = norm(q.name);
  if ("description" in q && q.description != null) q.description = norm(q.description);
  if ("unit" in q && q.unit != null) q.unit = norm(q.unit);
  if ("photo_url" in q && q.photo_url != null) q.photo_url = norm(q.photo_url);
  return q;
}

// Servicio
export async function createItemSvc(input) {
  const data = createSchema.parse(normalizeItemPayload(input));
  const existing = await findItemBySku(data.sku);
  if (existing) throw new Error("SKU ya existe");
  return createItem(data);
}

export async function updateItemSvc(id, patch) {
  const current = await findItemById(id);
  if (!current) throw new Error("Item no encontrado");
  const data = updateSchema.parse(normalizeItemPayload(patch));
  if (data.sku && data.sku !== current.sku) {
    const existing = await findItemBySku(data.sku);
    if (existing) throw new Error("SKU ya existe");
  }
  return updateItem(id, data);
}

export async function getItemByIdSvc(id) {
  const it = await findItemById(id);
  if (!it) throw new Error("Item no encontrado");
  return it;
}

export async function listItemsSvc() {
  return findAllItems();
}

export async function searchItemsSvc(q) {
  const s = norm(q || "");
  if (!s) return [];
  return searchItemsByName(s);
}

export async function deleteItemLogicalSvc(id) {
  const it = await deleteItemLogical(id);
  if (!it) throw new Error("Item no encontrado");
  return it;
}



