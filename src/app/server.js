// src/app/server.js
import http from "http";
import dotenv from "dotenv";
import { createRouter } from "./router.js";

import { registerAuthRoutes } from "../modules/auth/auth.routes.js";
import { registerItemRoutes } from "../modules/items/items.routes.js";
import { registerWarehouseRoutes } from "../modules/warehouses/warehouses.routes.js";
import { registerStockRoutes } from "../modules/stock/stock.routes.js";
import { registerMovementRoutes } from "../modules/movements/movements.routes.js";
import { registerReportRoutes } from "../modules/reports/reports.routes.js"; // <-- reports

dotenv.config();

const router = createRouter();

// Registrar rutas
registerAuthRoutes(router);
registerItemRoutes(router);
registerWarehouseRoutes(router);
registerStockRoutes(router);
registerMovementRoutes(router);
registerReportRoutes(router); // <-- integración de reports

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Content-Length": 0 });
    res.end();
    return;
  }

  router.handle(req, res);
});

server.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
