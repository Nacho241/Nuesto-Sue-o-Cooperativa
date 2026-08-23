export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/storage/")) {
      const key = decodeURIComponent(url.pathname.slice("/api/storage/".length));
      if (!key) return json({ error: "Falta la clave" }, 400);

      if (request.method === "GET") {
        const row = await env.DB.prepare(
          "SELECT value, updated_at FROM app_storage WHERE key = ?"
        ).bind(key).first();

        if (!row) return json({ error: "No encontrado" }, 404);
        return json({ value: row.value, updatedAt: row.updated_at });
      }

      if (request.method === "PUT") {
        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        if (typeof body.value !== "string") {
          return json({ error: "value debe ser string" }, 400);
        }

        await env.DB.prepare(`
          INSERT INTO app_storage (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = datetime('now')
        `).bind(key, body.value).run();

        return json({ ok: true });
      }

      return json({ error: "Método no permitido" }, 405);
    }

    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
