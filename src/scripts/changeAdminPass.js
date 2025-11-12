import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";

const newPass = "Cubproy2025";
const hash = await bcrypt.hash(newPass, 10);
await pool.query("UPDATE users SET password=$1 WHERE email=$2", [hash, "admin@cubica.com"]);
console.log("Contraseña de admin actualizada correctamente.");
await pool.end();
