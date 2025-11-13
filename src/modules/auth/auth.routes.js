import { readJson } from "../../utils/body.js";
import { registerSvc, loginSvc } from "./auth.service.js";
import { requireRole } from "../../middleware/auth.js"; // protege rutas por rol

export function registerAuthRoutes(router) {
  // Solo ADMIN puede registrar usuarios
  router.add(
    "POST",
    "/api/auth/register",
    requireRole("ADMIN")(async (req, res) => {
      try {
        const body = await readJson(req);
        const user = await registerSvc(body);
        router.json(res, 201, user);
      } catch (e) {
        router.json(res, 400, { error: e.message || "Solicitud invalida" });
      }
    })
  );

  // Login público (sin authRequired)
  router.add("POST", "/api/auth/login", async (req, res) => {
    console.log("→ /api/auth/login hit");  // TEMP
    try {
      const body = await readJson(req);
      console.log("login body:", body);    // TEMP
      const { token } = await loginSvc(body);
      router.json(res, 200, { ok: true, token });
    } catch (e) {
      console.error("login error:", e);    // TEMP
      router.json(res, 401, { error: e.message || "No autorizado" });
    }
  });
}
