import { readJson } from "../../utils/body.js";
import {
  getStockSvc,
  listByItemSvc,
  listByWarehouseSvc,
  upsertDeltaSvc,
  updateReservedSvc
} from "./stock.service.js";
import { authRequired, requireRole } from "../../middleware/auth.js";

export function registerStockRoutes(router) {
  // GET /api/stock?itemId=&warehouseId=
  router.add("GET", "/api/stock", authRequired(async (req, res) => {
    const itemId = Number((req.query?.itemId ?? "").toString());
    const warehouseId = Number((req.query?.warehouseId ?? "").toString());

    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(warehouseId) || warehouseId <= 0) {
      return router.json(res, 400, { error: "Parámetros inválidos: itemId y warehouseId son requeridos y deben ser numéricos" });
    }

    try {
      const row = await getStockSvc({ itemId, warehouseId });
      return router.json(res, 200, row);
    } catch (e) {
      return router.json(res, 404, { error: e.message || "Stock no encontrado" });
    }
  }));

  // GET /api/stock/item/:itemId
  router.add("GET", "/api/stock/item/:itemId", authRequired(async (req, res) => {
    const itemId = Number(req.params.itemId);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return router.json(res, 400, { error: "Parámetro inválido: itemId" });
    }
    const rows = await listByItemSvc({ itemId });
    return router.json(res, 200, rows);
  }));

  // GET /api/stock/warehouse/:warehouseId
  router.add("GET", "/api/stock/warehouse/:warehouseId", authRequired(async (req, res) => {
    const warehouseId = Number(req.params.warehouseId);
    if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
      return router.json(res, 400, { error: "Parámetro inválido: warehouseId" });
    }
    const rows = await listByWarehouseSvc({ warehouseId });
    return router.json(res, 200, rows);
  }));

  // POST /api/stock/upsert  { itemId, warehouseId, delta }
  router.add("POST", "/api/stock/upsert", requireRole("ADMIN")(async (req, res) => {
    try {
      const body = await readJson(req);
      const saved = await upsertDeltaSvc(body);
      return router.json(res, 200, saved);
    } catch (e) {
      return router.json(res, 400, { error: e.message || "Solicitud inválida" });
    }
  }));

  // POST /api/stock/reserve  { itemId, warehouseId, reservedDelta }
  router.add("POST", "/api/stock/reserve", requireRole("ADMIN")(async (req, res) => {
    try {
      const body = await readJson(req);
      const saved = await updateReservedSvc(body);
      return router.json(res, 200, saved);
    } catch (e) {
      return router.json(res, 400, { error: e.message || "Solicitud inválida" });
    }
  }));
}
