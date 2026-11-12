// SPMTrial quiz-links service (Cloudflare Worker + KV).
//   GET  /quiz-links.json   public, read-only: { rowId: { k1, k1b, k2 } }  (k1b = 2nd K1 part, e.g. BM Bahagian B)  (used by the site to show Allite buttons)
//   GET  /admin/api/quiz    admin read  (behind Cloudflare Access)
//   POST /admin/api/quiz    admin save  (behind Cloudflare Access + email check)
//        body: { changes: { rowId: { k1: "https://..", k2: "" } } }   ("" removes a link)

const KEY = "links";

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });

const okUrl = (u) => typeof u === "string" && /^https?:\/\/[^\s"<>]+$/i.test(u) && u.length < 2000;

async function load(env) {
  return (await env.QUIZ.get(KEY, "json")) || {};
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    // public read for the site
    if (path === "/quiz-links.json" && req.method === "GET") {
      return json(await load(env), 200, {
        "cache-control": "public, max-age=30",
        "access-control-allow-origin": "*",
      });
    }

    if (path === "/admin/api/quiz") {
      // Cloudflare Access sits in front of /admin/*; double-check the signed-in email here too.
      const who = (req.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
      const allowed = (env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
      if (!who || !allowed.includes(who)) return json({ error: "Tidak dibenarkan" }, 403);

      if (req.method === "GET") return json({ links: await load(env), user: who }, 200, { "cache-control": "no-store" });

      if (req.method === "POST") {
        let body;
        try { body = await req.json(); } catch { return json({ error: "JSON tidak sah" }, 400); }
        const changes = body && body.changes;
        if (!changes || typeof changes !== "object") return json({ error: "Tiada perubahan" }, 400);

        const links = await load(env);
        let n = 0;
        for (const [id, v] of Object.entries(changes)) {
          if (!/^[0-9a-f]{10}(-\d+)?$/.test(id) || !v || typeof v !== "object") continue;
          const cur = { ...(links[id] || {}) };
          for (const k of ["k1", "k1b", "k2"]) {
            if (!(k in v)) continue;
            const val = String(v[k] || "").trim();
            if (!val) delete cur[k];
            else if (okUrl(val)) cur[k] = val;
            else return json({ error: `Pautan tidak sah untuk ${id} (${k})` }, 400);
          }
          if (Object.keys(cur).length) links[id] = cur; else delete links[id];
          n++;
        }
        await env.QUIZ.put(KEY, JSON.stringify(links));
        // keep a dated backup of every save (kept 1 year)
        await env.QUIZ.put("backup:" + new Date().toISOString(), JSON.stringify(links), { expirationTtl: 31536000 });
        return json({ ok: true, saved: n, total: Object.keys(links).length });
      }
      return json({ error: "Kaedah tidak disokong" }, 405);
    }

    return fetch(req); // anything else: pass through to the website
  },
};
