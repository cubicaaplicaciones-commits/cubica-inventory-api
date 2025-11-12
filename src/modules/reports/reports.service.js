import { z } from "zod";
import {
  reportStockTotalsByItem,
  reportMovements
} from "./reports.repo.js";

const listMovementsSchema = z.object({
  type: z
    .string()
    .transform(s => s.trim().toUpperCase())
    .optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  itemId: z.coerce.number().int().positive().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional().default(100),
  offset: z.coerce.number().int().nonnegative().optional().default(0)
}).superRefine((data, ctx) => {
  if (data.type && !["IN", "OUT", "TRANSFER", "ADJUST"].includes(data.type)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo inválido", path: ["type"] });
  }
  if (data.from && isNaN(Date.parse(data.from))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "from inválido", path: ["from"] });
  }
  if (data.to && isNaN(Date.parse(data.to))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "to inválido", path: ["to"] });
  }
});

export async function stockTotalsByItemSvc() {
  return reportStockTotalsByItem();
}

export async function movementsReportSvc(params = {}) {
  const p = listMovementsSchema.parse(params);
  return reportMovements(p);
}
