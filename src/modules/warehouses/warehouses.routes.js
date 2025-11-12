import { readJson } from "../../utils/body.js";
import {
  createWarehouseSvc,
  updateWarehouseSvc,
  getWarehouseByIdSvc,
  listWarehousesSvc,
  searchWarehousesSvc,
  deleteWarehouseLogicalSvc
} from "./warehouses.service.js";
import { authRequired, requireRole } from "../../middleware/auth.js";

export function registerWarehouseRoutes(router) {
  // Listar o buscar ?q=
  router.add("GET", "/api/warehouses", authRequired(async (req, res) => {
    const q = (req.query?.q ?? "").toString();
    const data = q ? await searchWarehousesSvc(q) : await listWarehousesSvc();
    router.json(res, 200, data);
  }));

  // Obtener por id
  router.add("GET", "/api/warehouses/:id", authRequired(async (req, res) => {
    try {
      const id = Number(req.params.id);
      const wh = await getWarehouseByIdSvc(id);
      router.json(res, 200, wh);
    } catch (e) {
      router.json(res, 404, { error: e.message || "Almacén no encontrado" });
    }
  }));

  // Crear (ADMIN)
  router.add("POST", "/api/warehouses", requireRole("ADMIN")(async (req, res) => {
    try {
      const body = await readJson(req);
      const saved = await createWarehouseSvc(body);
      router.json(res, 201, saved);
    } catch (e) {
      router.json(res, 400, { error: e.message || "Solicitud inválida" });
    }
  }));

  // Actualizar (ADMIN)
  router.add("PUT", "/api/warehouses/:id", requireRole("ADMIN")(async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = await readJson(req);
      const updated = await updateWarehouseSvc(id, body);
      router.json(res, 200, updated);
    } catch (e) {
      router.json(res, 400, { error: e.message || "Solicitud inválida" });
    }
  }));

  // Borrado lógico (ADMIN)
  router.add("DELETE", "/api/warehouses/:id", requireRole("ADMIN")(async (req, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await deleteWarehouseLogicalSvc(id);
      router.json(res, 200, deleted);
    } catch (e) {
      router.json(res, 400, { error: e.message || "Solicitud inválida" });
    }
  }));
}
