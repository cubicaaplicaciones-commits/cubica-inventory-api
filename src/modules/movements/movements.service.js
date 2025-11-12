import { z } from "zod";
import {
  createMovementRepo,
  getMovementByIdRepo,
  listMovementsRepo
} from "./movements.repo.js";

const movementTypeEnum = z.enum(["IN", "OUT", "TRANSFER", "ADJUST"]);

const lineSchema = z.object({
  item_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  unit_cost: z.coerce.number().nonnegative().optional().default(0)
});

const createSchema = z.object({
  type: z.string().transform(s => s.trim().toUpperCase()).pipe(movementTypeEnum),
  movement_date: z.union([z.string(), z.date()]).optional(),
  origin_warehouse_id: z.coerce.number().int().positive().optional().nullable(),
  destination_warehouse_id: z.coerce.number().int().positive().optional().nullable(),
  project_id: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  lines: z.array(lineSchema).min(1)
}).superRefine((data, ctx) => {
  if (data.type === "IN" && !data.destination_warehouse_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "IN requiere destination_warehouse_id", path: ["destination_warehouse_id"] });
  }
  if (data.type === "OUT" && !data.origin_warehouse_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "OUT requiere origin_warehouse_id", path: ["origin_warehouse_id"] });
  }
  if (data.type === "TRANSFER") {
    if (!data.origin_warehouse_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "TRANSFER requiere origin_warehouse_id", path: ["origin_warehouse_id"] });
    }
    if (!data.destination_warehouse_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "TRANSFER requiere destination_warehouse_id", path: ["destination_warehouse_id"] });
    }
  }
  if (data.type === "ADJUST" && !data.destination_warehouse_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ADJUST requiere destination_warehouse_id", path: ["destination_warehouse_id"] });
  }
});

const idSchema = z.coerce.number().int().positive();

const listSchema = z.object({
  type: z.string().transform(s => s.trim().toUpperCase()).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
}).transform(o => {
  const out = { ...o };
  if (out.type) out.type = out.type.toUpperCase();
  return out;
});

export async function createMovementSvc(input) {
  const data = createSchema.parse(input);
  return createMovementRepo(data);
}

export async function getMovementByIdSvc(id) {
  const movId = idSchema.parse(id);
  const r = await getMovementByIdRepo(movId);
  if (!r) throw new Error("Movimiento no encontrado");
  return r;
}

export async function listMovementsSvc(params = {}) {
  const p = listSchema.parse(params);
  if (p.type && !["IN", "OUT", "TRANSFER", "ADJUST"].includes(p.type)) {
    throw new Error("Tipo inválido");
  }
  return listMovementsRepo(p);
}
