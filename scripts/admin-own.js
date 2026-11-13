// Admin tab "Kertas sendiri": the owner adds their own papers (e.g. Trial SPM 2027) with their own Google Drive links.
// Saved to the Cloudflare worker (KV key "custom"); app.js shows them on subject pages at once, build.py bakes them in.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var ROWS = null, META = { subjects: [], types: [], states: [] }, DIRTY = false, OK = false, loading = false;
  var okUrl = function (u) { return /^https?:\/\/\S+$/i.test(u || ""); };
  var newId = function () { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };

  function state(t, cls) { $("own-state").innerHTML = '<span class="' + (cls || "muted") + '">' + t + "</span>"; }
  function dirty() { DIRTY = true; $("own-save").disabled = !OK; $("own-save").textContent = "Simpan & terbitkan •"; }
  function api(opt) {
    return fetch("../admin/api/custom", Object.assign({ credentials: "same-origin", cache: "no-store" }, opt || {})).then(function (r) {
      var ct = r.headers.get("content-type") || "";
      if (!ct.includes("json")) throw new Error(r.status === 200 ? "Sesi tamat — muat semula halaman untuk log masuk" : "HTTP " + r.status);
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; });
    });
  }
  var opts = function (arr, sel, blank) {
    return (blank ? '<option value="">' + esc(blank) + "</option>" : "") +
      arr.map(function (a) { return '<option value="' + esc(a[0]) + '"' + (String(a[0]) === String(sel) ? " selected" : "") + ">" + esc(a[1]) + "</option>"; }).join("");
  };
  var subjName = function (s) { var x = META.subjects.filter(function (a) { return a[0] === s; })[0]; return x ? x[1] : s; };

  function card(r, i) {
    var links = (r.links.length ? r.links : [{ t: "", u: "" }]).map(function (l, j) {
      var bad = l.u && !okUrl(l.u);
      return '<div class="own-l" data-j="' + j + '"><label>Nama butang<input list="own-lab" data-l="t" value="' + esc(l.t) + '" placeholder="Kertas 1"></label>' +
        '<label>Pautan Google Drive<input type="url" data-l="u" value="' + esc(l.u) + '" placeholder="https://drive.google.com/…"' + (bad ? ' style="border-color:#b91c1c"' : "") + "></label>" +
        '<button class="del" data-rmlink title="Buang pautan">✕</button></div>';
    }).join("");
    var stOpts = META.states.map(function (s) { return [s, s]; });
    if (r.st && META.states.indexOf(r.st) < 0) stOpts.push([r.st, r.st]);
    return '<div class="own' + (r.on ? "" : " off") + (r._new ? " new" : "") + '" data-i="' + i + '">' +
      '<div class="own-top"><label class="row1" style="margin:0"><input type="checkbox" data-f="on"' + (r.on ? " checked" : "") + "> <b>" +
      esc(subjName(r.s) || "Subjek?") + " · " + esc(r.y || "") + " · " + esc(r.label || r.st || "") + "</b></label>" +
      '<span>' + (r.s && !r._new ? '<a class="muted" href="/spm/' + esc(r.s) + "/#r-" + esc(r.id) + '" target="_blank">lihat di laman ↗</a> ' : "") +
      '<button class="del" data-del>Padam</button></span></div>' +
      '<div class="own-g">' +
      '<label>Subjek<select data-f="s">' + opts(META.subjects, r.s, "— pilih subjek —") + "</select></label>" +
      '<label>Jenis<select data-f="t">' + opts(META.types, r.t) + "</select></label>" +
      '<label>Tahun<input type="number" data-f="y" min="2000" max="2100" value="' + esc(r.y || "") + '"></label>' +
      '<label>Negeri / institusi<select data-f="st">' + opts(stOpts, r.st, "— tiada —") + "</select></label>" +
      '<label>Nama baris (dipapar)<input type="text" data-f="label" maxlength="120" value="' + esc(r.label) + '" placeholder="cth. Johor, MRSM Set 1, SMK ABC"></label>' +
      "</div>" + links +
      '<div class="own-q"><button data-q="Kertas 1">+ Kertas 1</button><button data-q="Jawapan K1">+ Jawapan K1</button><button data-q="Kertas 2">+ Kertas 2</button><button data-q="Jawapan K2">+ Jawapan K2</button><button data-q="Kertas 3">+ Kertas 3</button><button data-q="">+ Pautan lain</button></div></div>';
  }

  function visible() {
    var fs = $("own-fsub").value, q = ($("own-fq").value || "").toLowerCase();
    return ROWS.map(function (r, i) { return [r, i]; }).filter(function (x) {
      var r = x[0];
      if (fs && r.s !== fs) return false;
      if (q && (subjName(r.s) + " " + r.y + " " + r.st + " " + r.label + " " + r.links.map(function (l) { return l.t + " " + l.u; }).join(" ")).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function draw() {
    var v = visible();
    $("own-list").innerHTML = v.length ? v.map(function (x) { return card(x[0], x[1]); }).join("") :
      '<p class="muted">Belum ada kertas sendiri. Tekan <b>+ Tambah kertas</b>.</p>';
    $("own-count").textContent = ROWS.length + " kertas sendiri" + (v.length !== ROWS.length ? " (" + v.length + " dipapar)" : "");
  }

  $("own-list").addEventListener("input", function (e) {
    var c = e.target.closest(".own"); if (!c) return;
    var r = ROWS[+c.dataset.i], f = e.target.dataset.f, l = e.target.dataset.l;
    if (f) {
      r[f] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      if (f === "y") r.y = e.target.value ? parseInt(e.target.value, 10) : null;
      if (f === "st" && !r.label) { r.label = r.st; c.querySelector('[data-f="label"]').value = r.st; }
      if (f === "on") c.classList.toggle("off", !r.on);
    } else if (l) {
      var j = +e.target.closest(".own-l").dataset.j;
      while (r.links.length <= j) r.links.push({ t: "", u: "" });
      r.links[j][l] = e.target.value.trim();
      if (l === "u") e.target.style.borderColor = r.links[j].u && !okUrl(r.links[j].u) ? "#b91c1c" : "";
    }
    dirty();
  });
  $("own-list").addEventListener("change", function (e) { if (e.target.tagName === "SELECT") draw(); });
  $("own-list").addEventListener("click", function (e) {
    var c = e.target.closest(".own"); if (!c || e.target.tagName !== "BUTTON") return;
    var i = +c.dataset.i, r = ROWS[i];
    if (e.target.hasAttribute("data-del")) {
      if (!confirm("Padam " + subjName(r.s) + " " + (r.y || "") + " " + (r.label || "") + "?")) return;
      ROWS.splice(i, 1);
    } else if (e.target.hasAttribute("data-rmlink")) {
      r.links.splice(+e.target.closest(".own-l").dataset.j, 1);
    } else if (e.target.hasAttribute("data-q")) {
      var empty = r.links.filter(function (l) { return !l.u && !l.t; })[0];
      if (empty) empty.t = e.target.dataset.q; else r.links.push({ t: e.target.dataset.q, u: "" });
    } else return;
    dirty(); draw();
  });
  $("own-add").addEventListener("click", function () {
    var last = ROWS[0] || {};
    ROWS.unshift({ id: newId(), on: true, s: $("own-fsub").value || last.s || "", t: last.t || "percubaan", y: last.y || new Date().getFullYear(),
      st: "", label: "", links: [{ t: "Kertas 1", u: "" }, { t: "Jawapan K1", u: "" }, { t: "Kertas 2", u: "" }, { t: "Jawapan K2", u: "" }], _new: true });
    $("own-fq").value = ""; dirty(); draw(); window.scrollTo(0, 0);
  });
  $("own-fsub").addEventListener("change", draw);
  $("own-fq").addEventListener("input", draw);

  $("own-save").addEventListener("click", function () {
    var clean = [], err = "";
    ROWS.forEach(function (r, i) {
      var links = r.links.filter(function (l) { return l.u; });
      if (!r.s) err = err || "Pilih subjek untuk setiap kertas.";
      if (!links.length) err = err || "Setiap kertas perlu sekurang-kurangnya satu pautan (" + subjName(r.s) + " " + (r.y || "") + ").";
      links.forEach(function (l) { if (!okUrl(l.u)) err = err || "Pautan mesti bermula dengan https:// — " + l.u.slice(0, 50); });
      clean.push({ id: r.id, on: r.on, s: r.s, t: r.t, y: r.y || null, st: r.st, label: r.label || r.st, links: links.map(function (l) { return { t: l.t || "Fail", u: l.u }; }), at: r.at });
    });
    if (err) { state(esc(err), "err"); return; }
    $("own-save").disabled = true; state("Menyimpan…");
    api({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: clean }) }).then(function (j) {
      ROWS = j.rows; DIRTY = false; $("own-save").textContent = "Simpan & terbitkan"; draw();
      state("✓ Disimpan. Kertas muncul di halaman subjek dalam ~1 minit.", "ok");
    }).catch(function (e) { state("Gagal simpan: " + esc(e.message), "err"); $("own-save").disabled = false; });
  });

  window.ownLoad = function () {
    if (ROWS || loading) return; loading = true; state("Memuatkan…");
    Promise.all([api(), fetch("rows.json", { cache: "force-cache" }).then(function (r) { return r.json(); })]).then(function (a) {
      ROWS = a[0].rows || []; OK = true;
      META = { subjects: a[1].subjects || [], types: a[1].types || [], states: a[1].states || [] };
      $("own-fsub").insertAdjacentHTML("beforeend", opts(META.subjects));
      draw(); state("✓ Log masuk sebagai " + esc(a[0].user) + " — boleh simpan", "ok");
    }).catch(function (e) { state("Tidak boleh muat: " + esc(e.message), "err"); }).then(function () { loading = false; });
  };
  window.addEventListener("beforeunload", function (e) { if (DIRTY) { e.preventDefault(); e.returnValue = ""; } });
})();
