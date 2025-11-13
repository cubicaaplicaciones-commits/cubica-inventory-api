import { requireRole } from "../../middleware/auth.js";
import { readJson } from "../../utils/body.js";
import {
  listUsersSvc,
  getUserByIdSvc,
  createUserSvc,
  updateUserSvc,
  deactivateUserSvc
} from "./user.service.js";

/* Extrae id desde params o desde la URL */
function getIdFromReq(req) {
  if (req.params && req.params.id != null) return req.params.id;
  const url = req.url || "";
  const clean = url.split("?")[0];
  const parts = clean.split("/");
  return parts[parts.length - 1];
}

export function registerUserRoutes(router) {
  /* Lista todos los usuarios (solo admin) */
  router.add(
    "GET",
    "/api/users",
    requireRole("ADMIN")(async (req, res) => {
      try {
        const users = await listUsersSvc();
        router.json(res, 200, { items: users });
      } catch (e) {
        router.json(res, 500, { error: e.message || "Error al listar usuarios" });
      }
    })
  );

  /* Obtiene un usuario por id (solo admin) */
  router.add(
    "GET",
    "/api/users/:id",
    requireRole("ADMIN")(async (req, res) => {
      try {
        const id = getIdFromReq(req);
        const user = await getUserByIdSvc(id);
        router.json(res, 200, user);
      } catch (e) {
        const msg = e.message || "";
        const code = msg.toLowerCase().includes("no encontrado") ? 404 : 400;
        router.json(res, code, { error: msg || "Error al obtener usuario" });
      }
    })
  );

  /* Crea usuario (solo admin) */
  router.add(
    "POST",
    "/api/users",
    requireRole("ADMIN")(async (req, res) => {
      try {
        const body = await readJson(req);
        const user = await createUserSvc(body);
        router.json(res, 201, user);
      } catch (e) {
        router.json(res, 400, { error: e.message || "No se pudo crear el usuario" });
      }
    })
  );

  /* Actualiza usuario (solo admin) */
  router.add(
    "PUT",
    "/api/users/:id",
    requireRole("ADMIN")(async (req, res) => {
      try {
        const id = getIdFromReq(req);
        const body = await readJson(req);
        const user = await updateUserSvc(id, body);
        router.json(res, 200, user);
      } catch (e) {
        router.json(res, 400, { error: e.message || "No se pudo actualizar el usuario" });
      }
    })
  );

  /* Desactiva usuario (soft delete, solo admin) */
  router.add(
    "DELETE",
    "/api/users/:id",
    requireRole("ADMIN")(async (req, res) => {
      try {
        const id = getIdFromReq(req);
        const user = await deactivateUserSvc(id);
        router.json(res, 200, user);
      } catch (e) {
        router.json(res, 400, { error: e.message || "No se pudo desactivar el usuario" });
      }
    })
  );
}
