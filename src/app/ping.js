import { ping } from "../db/pool.js";

(async () => {
  const ok = await ping();
  console.log(ok ? "DB OK" : "DB FAIL");
  process.exit(ok ? 0 : 1);
})();



