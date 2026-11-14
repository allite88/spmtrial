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

const SITE_KEY = "site";
const MEDIA_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

function cleanSite(c) {
  const str = (v, n) => String(v == null ? "" : v).slice(0, n);
  const url = (v) => { v = str(v, 2000).trim(); return v === "" || okUrl(v) || /^\/media\/[\w.-]+$/.test(v) ? v : null; };
  const sup = c.support || {};
  const out = {
    support: { on: !!sup.on, title: str(sup.title, 120), text: str(sup.text, 600), img: url(sup.img), link: url(sup.link), note: str(sup.note, 160) },
    placeholder: { on: !!(c.placeholder || {}).on, text: str((c.placeholder || {}).text, 200), wa: str((c.placeholder || {}).wa, 20).replace(/\D/g, ""), waText: str((c.placeholder || {}).waText, 300) },
    sponsors: [],
  };
  const cm = c.community || {};
  out.community = { on: !!cm.on, year: Math.min(2100, Math.max(2000, parseInt(cm.year, 10) || new Date().getFullYear() + 1)),
    stuText: str(cm.stuText, 200), stuBtn: str(cm.stuBtn, 60), stuLink: url(cm.stuLink),
    tchText: str(cm.tchText, 200), tchWa: str(cm.tchWa, 20).replace(/\D/g, ""), tchMsg: str(cm.tchMsg, 400) };
  if (out.community.stuLink === null) throw new Error("Pautan kumpulan pelajar tidak sah");
  if (out.support.img === null || out.support.link === null) throw new Error("Pautan sokongan tidak sah");
  for (const sp of (Array.isArray(c.sponsors) ? c.sponsors : []).slice(0, 100)) {
    const o = { id: str(sp.id, 40) || Math.random().toString(36).slice(2, 10), on: !!sp.on, name: str(sp.name, 120), img: url(sp.img), url: url(sp.url), where: str(sp.where, 80) || "all" };
    if (o.img === null || o.url === null) throw new Error("Pautan iklan tidak sah: " + (o.name || o.id));
    out.sponsors.push(o);
  }
  return out;
}

const CUSTOM_KEY = "custom";
const CUSTOM_TYPES = ["percubaan", "sebenar", "nota", "latihan", "bukuteks", "karangan", "lisan", "amali", "teknik", "lain"];
function cleanCustom(list) {
  if (!Array.isArray(list)) throw new Error("Data tidak sah");
  if (list.length > 3000) throw new Error("Terlalu banyak baris (maks 3000)");
  const str = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  return list.map((r, i) => {
    const id = str(r.id, 20);
    if (!/^c[0-9a-z]{4,18}$/.test(id)) throw new Error("ID baris tidak sah (#" + (i + 1) + ")");
    const s = str(r.s, 40), t = str(r.t, 20);
    if (!/^[a-z0-9-]{2,40}$/.test(s)) throw new Error("Pilih subjek (#" + (i + 1) + ")");
    if (!CUSTOM_TYPES.includes(t)) throw new Error("Jenis tidak sah (#" + (i + 1) + ")");
    const y = r.y === "" || r.y == null ? null : parseInt(r.y, 10);
    if (y !== null && !(y >= 2000 && y <= 2100)) throw new Error("Tahun tidak sah (#" + (i + 1) + ")");
    const links = (Array.isArray(r.links) ? r.links : []).slice(0, 12).map((l) => ({ t: str(l.t, 60) || "Fail", u: str(l.u, 2000) })).filter((l) => l.u);
    for (const l of links) if (!okUrl(l.u)) throw new Error("Pautan tidak sah: " + l.u.slice(0, 60));
    if (!links.length) throw new Error("Tiada pautan fail (#" + (i + 1) + ")");
    return { id, on: r.on !== false, s, t, y, st: str(r.st, 60), label: str(r.label, 120), links, at: str(r.at, 30) || new Date().toISOString() };
  });
}

// ---- public paper sharing: visitors submit Drive links; they only show up in /admin ("Kiriman") for the owner to check.
const SUB_PREFIX = "sub:";
function cleanSubmission(b) {
  const str = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const y = parseInt(b.y, 10);
  if (!(y >= 2000 && y <= 2100)) throw new Error("Pilih tahun");
  const s = str(b.s, 40);
  if (!/^[a-z0-9-]{2,40}$/.test(s)) throw new Error("Pilih subjek");
  const st = str(b.st, 80);
  if (!st) throw new Error("Isi negeri / institusi");
  const L = [["k1", "Kertas 1"], ["k2", "Kertas 2"], ["j1", "Skema K1"], ["j2", "Skema K2"], ["lain", "Lain-lain"]];
  const links = [];
  for (const [k, t] of L) {
    const u = str(b[k], 2000);
    if (!u) continue;
    if (!okUrl(u)) throw new Error("Pautan " + t + " mesti bermula dengan https://");
    links.push({ k, t, u });
  }
  if (!links.length) throw new Error("Masukkan sekurang-kurangnya satu pautan");
  const wa = str(b.wa, 20).replace(/\D/g, "");
  if (wa.length < 9) throw new Error("Masukkan nombor WhatsApp yang sah");
  return { y, s, st, t: b.t === "sebenar" ? "sebenar" : "percubaan", links, wa,
           name: str(b.name, 80), school: str(b.school, 120), note: str(b.note, 500) };
}

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

    if (path === "/site-config.json" && req.method === "GET") {
      return json((await env.QUIZ.get(SITE_KEY, "json")) || {}, 200, {
        "cache-control": "public, max-age=60",
        "access-control-allow-origin": "*",
      });
    }

    if (path === "/custom-rows.json" && req.method === "GET") {
      return json((await env.QUIZ.get(CUSTOM_KEY, "json")) || [], 200, {
        "cache-control": "public, max-age=60",
        "access-control-allow-origin": "*",
      });
    }

    if (path === "/api/kongsi" && req.method === "POST") {
      let b;
      try { b = await req.json(); } catch (e) { return json({ error: "Data tidak sah" }, 400); }
      if (b.website) return json({ ok: true });   // honeypot field: bots fill it, people never see it
      const ip = req.headers.get("cf-connecting-ip") || "x";
      const rk = "rl:" + ip + ":" + new Date().toISOString().slice(0, 13);
      const n = parseInt((await env.QUIZ.get(rk)) || "0", 10);
      if (n >= 8) return json({ error: "Terlalu banyak kiriman — cuba lagi dalam sejam" }, 429);
      let sub;
      try { sub = cleanSubmission(b); } catch (e) { return json({ error: e.message }, 400); }
      const at = new Date().toISOString();
      const id = at.replace(/[-:.TZ]/g, "") + Math.random().toString(36).slice(2, 6);
      await env.QUIZ.put(SUB_PREFIX + id, JSON.stringify({ id, at, status: "baru", ...sub }), { expirationTtl: 60 * 60 * 24 * 400 });
      await env.QUIZ.put(rk, String(n + 1), { expirationTtl: 3700 });
      return json({ ok: true });
    }

    if (path === "/admin/api/kiriman") {
      const who = (req.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
      const allowed = (env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
      if (!who || !allowed.includes(who)) return json({ error: "Tidak dibenarkan" }, 403);
      if (req.method === "GET") {
        const keys = [];
        let cursor;
        do { const r = await env.QUIZ.list({ prefix: SUB_PREFIX, cursor }); keys.push(...r.keys); cursor = r.list_complete ? null : r.cursor; } while (cursor && keys.length < 2000);
        const subs = (await Promise.all(keys.map((k) => env.QUIZ.get(k.name, "json")))).filter(Boolean).sort((a, b) => (a.at < b.at ? 1 : -1));
        return json({ subs, user: who }, 200, { "cache-control": "no-store" });
      }
      if (req.method === "POST") {
        let b;
        try { b = await req.json(); } catch (e) { return json({ error: "JSON tidak sah" }, 400); }
        const id = String(b.id || "");
        if (!/^[0-9a-z]{10,40}$/.test(id)) return json({ error: "id tidak sah" }, 400);
        const key = SUB_PREFIX + id;
        if (b.action === "delete") { await env.QUIZ.delete(key); return json({ ok: true }); }
        const cur = await env.QUIZ.get(key, "json");
        if (!cur) return json({ error: "Tiada" }, 404);
        if (["baru", "diterbitkan", "ditolak"].includes(b.status)) cur.status = b.status;
        await env.QUIZ.put(key, JSON.stringify(cur), { expirationTtl: 60 * 60 * 24 * 400 });
        return json({ ok: true, sub: cur });
      }
      return json({ error: "Kaedah tidak disokong" }, 405);
    }

    if (path === "/admin/api/custom") {
      const who = (req.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
      const allowed = (env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
      if (!who || !allowed.includes(who)) return json({ error: "Tidak dibenarkan" }, 403);
      if (req.method === "GET") return json({ rows: (await env.QUIZ.get(CUSTOM_KEY, "json")) || [], user: who }, 200, { "cache-control": "no-store" });
      if (req.method === "POST") {
        let rows;
        try { rows = cleanCustom((await req.json()).rows); } catch (e) { return json({ error: e.message || "JSON tidak sah" }, 400); }
        const old = await env.QUIZ.get(CUSTOM_KEY);
        if (old) await env.QUIZ.put("backup-custom:" + new Date().toISOString(), old, { expirationTtl: 31536000 });
        await env.QUIZ.put(CUSTOM_KEY, JSON.stringify(rows));
        return json({ ok: true, rows });
      }
      return json({ error: "Kaedah tidak disokong" }, 405);
    }

    if (path.startsWith("/media/") && req.method === "GET") {
      const { value, metadata } = await env.QUIZ.getWithMetadata("media:" + path.slice(7), "arrayBuffer");
      if (!value) return new Response("Not found", { status: 404 });
      return new Response(value, { headers: { "content-type": (metadata && metadata.type) || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" } });
    }

    if (path === "/admin/api/site" || path === "/admin/api/upload") {
      const who = (req.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
      const allowed = (env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
      if (!who || !allowed.includes(who)) return json({ error: "Tidak dibenarkan" }, 403);

      if (path === "/admin/api/upload" && req.method === "POST") {
        const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        const ext = MEDIA_TYPES[type];
        if (!ext) return json({ error: "Jenis fail mesti PNG / JPG / WEBP / GIF" }, 400);
        const buf = await req.arrayBuffer();
        if (!buf.byteLength || buf.byteLength > 3 * 1024 * 1024) return json({ error: "Gambar mesti di bawah 3 MB" }, 400);
        const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + "." + ext;
        await env.QUIZ.put("media:" + name, buf, { metadata: { type, by: who } });
        return json({ ok: true, url: "/media/" + name });
      }
      if (path === "/admin/api/site" && req.method === "GET")
        return json({ site: (await env.QUIZ.get(SITE_KEY, "json")) || {}, user: who }, 200, { "cache-control": "no-store" });
      if (path === "/admin/api/site" && req.method === "POST") {
        let site;
        try { site = cleanSite(await req.json()); } catch (e) { return json({ error: e.message || "JSON tidak sah" }, 400); }
        const old = await env.QUIZ.get(SITE_KEY);
        if (old) await env.QUIZ.put("backup-site:" + new Date().toISOString(), old, { expirationTtl: 31536000 });
        await env.QUIZ.put(SITE_KEY, JSON.stringify(site));
        return json({ ok: true, site });
      }
      return json({ error: "Kaedah tidak disokong" }, 405);
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
          if (!/^([0-9a-f]{10}(-\d+)?|c[0-9a-z]{4,18})$/.test(id) || !v || typeof v !== "object") continue;
          const cur = { ...(links[id] || {}) };
          for (const k of ["k1", "k1b", "k2", "s1", "s2"]) {
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
