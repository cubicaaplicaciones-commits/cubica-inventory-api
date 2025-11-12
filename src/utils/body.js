export async function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on("data", chunk => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let json = null;
      const ct = req.headers["content-type"] || "";
      if (ct.includes("application/json") && raw.length > 0) {
        try {
          json = JSON.parse(raw);
        } catch {
          reject(new Error("Invalid JSON"));
          return;
        }
      }
      resolve({ raw, json });
    });

    req.on("error", err => reject(err));
  });
}

// Atajo para leer JSON, obliga a content-type application/json
export async function readJson(req, limitBytes = 1024 * 1024) {
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) {
    throw new Error("Unsupported Media Type");
  }
  const { json } = await readBody(req, limitBytes);
  if (json === null) throw new Error("Empty JSON");
  return json;
}



