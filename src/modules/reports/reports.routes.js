import { authRequired, requireRole } from "../../middleware/auth.js";
import { stockTotalsByItemSvc, movementsReportSvc } from "./reports.service.js";

export function registerReportRoutes(router) {
  // Stock total por ítem
  // GET /api/reports/stock-totals
  router.add("GET", "/api/reports/stock-totals", authRequired(async (req, res) => {
    const data = await stockTotalsByItemSvc();
    return router.json(res, 200, data);
  }));

  // Reporte de movimientos con filtros opcionales
  // GET /api/reports/movements?type=IN&from=2025-01-01&to=2025-12-31&itemId=1&warehouseId=2&limit=100&offset=0
  router.add("GET", "/api/reports/movements", authRequired(async (req, res) => {
    try {
      const params = {
        type: req.query?.type,
        from: req.query?.from,
        to: req.query?.to,
        itemId: req.query?.itemId,
        warehouseId: req.query?.warehouseId,
        limit: req.query?.limit,
        offset: req.query?.offset
      };
      const data = await movementsReportSvc(params);
      return router.json(res, 200, data);
    } catch (e) {
      return router.json(res, 400, { error: e.message || "Solicitud inválida" });
    }
  }));
}
