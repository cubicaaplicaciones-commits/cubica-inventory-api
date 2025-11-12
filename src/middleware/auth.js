// src/app/auth.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const AUTH_HEADER = "authorization";

/* Obtiene el token del encabezado Authorization */
function getTokenFromHeader(req) {
  const h = req.headers[AUTH_HEADER];
  if (!h) return null;
  const parts = h.split(" ");
  if (parts.length !== 2) return null;
  if (parts[0] !== "Bearer") return null;
  return parts[1];
}

/* Verifica y decodifica el token */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/* Middleware de autenticación */
export function authRequired(handler) {
  return async function wrapped(req, res) {
    const token = getTokenFromHeader(req);
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Unauthorized" }));
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid token" }));
    }

    // Se incluye el nombre del usuario en req.user
    req.user = {
      id: payload.uid || payload.id || null,
      email: payload.sub || payload.email || null,
      name: payload.name || payload.fullName || null, // ← nuevo campo
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };

    return handler(req, res);
  };
}

/* Middleware de autorización por rol */
export function requireRole(...roles) {
  const need = roles.map((r) => String(r).toUpperCase());
  return function withRole(handler) {
    return authRequired(async function wrapped(req, res) {
      const has = (req.user.roles || []).map((r) => String(r).toUpperCase());
      const ok =
        need.length === 0 ||
        need.some(
          (r) =>
            has.includes(r) ||
            has.includes("ROLE_" + r) ||
            ("ROLE_" + r) === r
        );
      if (!ok) {
        res.writeHead(403, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Forbidden" }));
      }
      return handler(req, res);
    });
  };
}
