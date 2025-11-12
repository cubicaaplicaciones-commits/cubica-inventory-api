import { readJson } from "../../utils/body.js";
import {
  createMovementSvc,
  getMovementByIdSvc,
  listMovementsSvc
} from "./movements.service.js";
import { authRequired, requireRole } from "../../middleware/auth.js";

export function registerMovementRoutes(router) {
  // Listar movimientos con filtros opcionales
  // GET /api/movements?type=IN&from=2025-01-01&to=2025-12-31&warehouseId=1&limit=20&offset=0
  router.add("GET", "/api/movements", authRequired(async (req, res) => {
    try {
      const params = {
        type: req.query?.type,
        from: req.query?.from,
        to: req.query?.to,
        warehouseId: req.query?.warehouseId,
        limit: req.query?.limit,
        offset: req.query?.offset
      };
      const rows = await listMovementsSvc(params);
      return router.json(res, 200, rows);
    } catch (e) {
      return router.json(res, 400, { error: e.message || "Solicitud inválida" });
    }
  }));

  // Obtener un movimiento por id
  // GET /api/movements/:id
  router.add("GET", "/api/movements/:id", authRequired(async (req, res) => {
    try {
      const id = Number(req.params.id);
      const mov = await getMovementByIdSvc(id);
      return router.json(res, 200, mov);
    } catch (e) {
      return router.json(res, 404, { error: e.message || "Movimiento no encontrado" });
    }
  }));

  // Crear movimiento (ADMIN)
  // POST /api/movements
  router.add("POST", "/api/movements", requireRole("ADMIN")(async (req, res) => {
    try {
      const body = await readJson(req);
      const result = await createMovementSvc(body);
      return router.json(res, 201, result);
    } catch (e) {
      return router.json(res, 400, { error: e.message || "Solicitud inválida" });
    }
  }));
}
