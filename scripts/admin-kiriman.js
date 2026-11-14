// Admin tab "Kiriman": papers shared by visitors via /kongsi/ (stored by the worker as KV "sub:*").
// Nothing here is public; the owner checks a submission and copies it to "Kertas sendiri" to publish it.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var SUBS = null, SUBJ = {}, loading = false;
  var NAMES = { k1: "Kertas 1", k2: "Kertas 2", j1: "Skema K1", j2: "Skema K2", lain: "Lain-lain" };

  function state(t, cls) { $("sub-state").innerHTML = '<span class="' + (cls || "muted") + '">' + t + "</span>"; }
  function api(opt) {
    return fetch("../admin/api/kiriman", Object.assign({ credentials: "same-origin", cache: "no-store" }, opt || {})).then(function (r) {
      var ct = r.headers.get("content-type") || "";
      if (!ct.includes("json")) throw new Error(r.status === 200 ? "Sesi tamat — muat semula halaman untuk log masuk" : "HTTP " + r.status);
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; });
    });
  }
  function post(body) { return api({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  function badge() { var n = SUBS.filter(function (x) { return x.status === "baru"; }).length; $("sub-badge").textContent = n ? n : ""; }
  function waLink(n) { n = String(n || "").replace(/\D/g, ""); if (/^0/.test(n)) n = "6" + n; return "https://wa.me/" + n; }

  function draw() {
    var f = $("sub-f").value, L = SUBS.filter(function (x) { return !f || x.status === f; });
    $("sub-count").textContent = SUBS.length + " kiriman" + (L.length !== SUBS.length ? " (" + L.length + " dipapar)" : "");
    $("sub-list").innerHTML = L.length ? L.map(function (x) {
      var when = (x.at || "").replace("T", " ").slice(0, 16);
      return '<div class="sub st-' + esc(x.status) + '" data-id="' + esc(x.id) + '"><div class="sub-top"><div><b>' + esc(SUBJ[x.s] || x.s) + " · " + esc(x.y) + " · " + esc(x.st) + "</b> " +
        '<span class="muted">' + (x.t === "sebenar" ? "Soalan sebenar" : "Percubaan") + " · " + esc(when) + "</span> <span class=\"tag\">" + esc(x.status) + "</span></div>" +
        '<div class="muted">' + (x.name ? esc(x.name) + " · " : "") + (x.school ? esc(x.school) + " · " : "") +
        '<a href="' + esc(waLink(x.wa)) + '" target="_blank" rel="noopener">WhatsApp ' + esc(x.wa) + "</a></div></div>" +
        '<div class="sub-l">' + (x.links || []).map(function (l) { return '<a href="' + esc(l.u) + '" target="_blank" rel="noopener nofollow">' + esc(NAMES[l.k] || l.t) + " ↗</a>"; }).join("") + "</div>" +
        (x.note ? '<p class="muted">“' + esc(x.note) + "”</p>" : "") +
        '<div class="sub-act"><button class="pri" data-a="use">→ Kertas sendiri</button>' +
        (x.status !== "ditolak" ? '<button data-a="ditolak">Tolak</button>' : '<button data-a="baru">Kembali ke Baru</button>') +
        '<button class="del" data-a="delete">Padam</button></div></div>';
    }).join("") : '<p class="muted">Tiada kiriman' + (f === "baru" ? " baharu" : "") + ".</p>";
  }

  $("sub-list").addEventListener("click", function (e) {
    var a = e.target.getAttribute && e.target.getAttribute("data-a"); if (!a) return;
    var id = e.target.closest(".sub").dataset.id, x = SUBS.filter(function (s) { return s.id === id; })[0]; if (!x) return;
    if (a === "use") {
      location.hash = "sendiri";
      window.ownLoad().then(function () { window.ownAddFrom(x); });
      return;
    }
    if (a === "delete" && !confirm("Padam kiriman ini selama-lamanya?")) return;
    e.target.disabled = true;
    post(a === "delete" ? { id: id, action: "delete" } : { id: id, status: a }).then(function () {
      if (a === "delete") SUBS = SUBS.filter(function (s) { return s.id !== id; }); else x.status = a;
      badge(); draw(); state("✓ Dikemas kini", "ok");
    }).catch(function (err) { state("Gagal: " + esc(err.message), "err"); e.target.disabled = false; });
  });
  $("sub-f").addEventListener("change", draw);
  $("sub-reload").addEventListener("click", function () { SUBS = null; window.subLoad(); });

  // called by admin-own.js after a save that published copied submissions
  window.kirimanMark = function (ids, status) {
    ids.forEach(function (id) {
      post({ id: id, status: status }).then(function () { if (SUBS) SUBS.forEach(function (s) { if (s.id === id) s.status = status; }); if (SUBS) { badge(); draw(); } }).catch(function () {});
    });
  };

  window.subLoad = function () {
    if (SUBS || loading) return; loading = true; state("Memuatkan…");
    Promise.all([api(), fetch("rows.json", { cache: "force-cache" }).then(function (r) { return r.json(); }).catch(function () { return { subjects: [] }; })]).then(function (a) {
      SUBS = a[0].subs || []; (a[1].subjects || []).forEach(function (s) { SUBJ[s[0]] = s[1]; });
      badge(); draw(); state("✓ Log masuk sebagai " + esc(a[0].user), "ok");
    }).catch(function (e) { state("Tidak boleh muat: " + esc(e.message), "err"); }).then(function () { loading = false; });
  };
  // show the "new" count on the tab as soon as the admin opens, whatever tab is active
  setTimeout(function () { if (!SUBS) window.subLoad(); }, 400);
})();
