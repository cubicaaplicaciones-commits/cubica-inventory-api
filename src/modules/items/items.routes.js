import { readJson } from "../../utils/body.js";
import {
  createItemSvc,
  updateItemSvc,
  getItemByIdSvc,
  listItemsSvc,
  searchItemsSvc,
  deleteItemLogicalSvc
} from "./items.service.js";

import { authRequired, requireRole } from "../../middleware/auth.js";


export function registerItemRoutes(router) {
  // Listar o buscar ?q=
  router.add("GET", "/api/items", authRequired(async (req, res) => {
    const q = (req.query?.q ?? "").toString();
    const data = q ? await searchItemsSvc(q) : await listItemsSvc();
    router.json(res, 200, data);
  }));

  // Obtener por id
  router.add("GET", "/api/items/:id", authRequired(async (req, res) => {
    try {
      const id = Number(req.params.id);
      const it = await getItemByIdSvc(id);
      router.json(res, 200, it);
    } catch (e) {
      router.json(res, 404, { error: e.message || "Item no encontrado" });
    }
  }));

  // Crear (ADMIN)
  router.add("POST", "/api/items", requireRole("ADMIN")(async (req, res) => {
    try {
      const body = await readJson(req);
      const saved = await createItemSvc(body);
      router.json(res, 201, saved);
    } catch (e) {
      router.json(res, 400, { error: e.message || "Solicitud invalida" });
    }
  }));

  // Actualizar (ADMIN)
  router.add("PUT", "/api/items/:id", requireRole("ADMIN")(async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = await readJson(req);
      const updated = await updateItemSvc(id, body);
      router.json(res, 200, updated);
    } catch (e) {
      router.json(res, 400, { error: e.message || "Solicitud invalida" });
    }
  }));

  // Borrado lÃ³gico (ADMIN)
  router.add("DELETE", "/api/items/:id", requireRole("ADMIN")(async (req, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await deleteItemLogicalSvc(id);
      router.json(res, 200, deleted);
    } catch (e) {
      router.json(res, 400, { error: e.message || "Solicitud invalida" });
    }
  }));
}



