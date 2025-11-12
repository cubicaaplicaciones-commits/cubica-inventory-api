import { parse } from "url";

/*helpers*/

function matchPath(pattern, path) {
  if (pattern === path) return { ok: true, params: {} };
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return { ok: false };
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) {
      params[a[i].slice(1)] = decodeURIComponent(b[i]);
    } else if (a[i] !== b[i]) {
      return { ok: false };
    }
  }
  return { ok: true, params };
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  // Evita escribir 2 veces si ya respondimos
  if (res.headersSent || res.writableEnded) return;
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function methodNotAllowed(res) {
  json(res, 405, { error: "Method not allowed" });
}

function badRequest(res, msg = "Bad request") {
  json(res, 400, { error: msg });
}

function internalError(res) {
  json(res, 500, { error: "Internal error" });
}

/*router*/

export function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    routes.push({ method: String(method || "").toUpperCase(), pattern, handler });
  }

  async function handle(req, res) {
    // ⚠️ timeout de seguridad: evita “cuelgues” eternos
    const t = setTimeout(() => {
      if (!res.writableEnded) {
        console.error("Router timeout:", req.method, req.url);
        internalError(res);
      }
    }, 10000); // 10s

    try {
      const { pathname, query } = parse(req.url, true);
      const path = pathname || "/";

      // Respuesta rápida a OPTIONS (evita colgados en preflight)
      if (req.method === "OPTIONS") {
        if (!res.headersSent && !res.writableEnded) {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-Length": 0,
          });
          res.end();
        }
        clearTimeout(t);
        return;
      }

      // Búsqueda de ruta coincidente
      for (const r of routes) {
        if (!r || r.method !== req.method) continue;
        if (typeof r.pattern !== "string" || !r.pattern) continue;

        const m = matchPath(r.pattern, path);
        if (!m || !m.ok) continue;

        req.params = m.params || {};
        req.query = query || {};

        // Ejecutar handler
        await r.handler(req, res);

        clearTimeout(t);
        return;
      }

      // 405 si el path existe con otro método
      for (const r of routes) {
        if (typeof r?.pattern === "string") {
          const m = matchPath(r.pattern, path);
          if (m && m.ok) {
            methodNotAllowed(res);
            clearTimeout(t);
            return;
          }
        }
      }

      // 404 si no coincide nada
      notFound(res);
    } catch (e) {
      console.error("Router error:", e);
      internalError(res);
    } finally {
      clearTimeout(t);
    }
  }

  return { add, handle, json, notFound, badRequest };
}
