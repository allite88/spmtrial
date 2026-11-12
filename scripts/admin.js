(function () {
  var LIMIT = 300, API = "api/quiz";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var norm = function (s) { return (s || "").toLowerCase(); };
  var ROWS = [], QUIZ = {}, EDIT = {}, OK = false;

  function status(t, cls) { var s = $("status"); s.textContent = t; s.className = cls || "muted"; }
  function api(method, body) {
    return fetch(API, { method: method, credentials: "same-origin", cache: "no-store",
      headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        var ct = r.headers.get("content-type") || "";
        if (!ct.includes("json")) { var e = new Error(r.status === 200 ? "Sesi tamat — muat semula halaman untuk log masuk" : "HTTP " + r.status); e.code = r.status; throw e; }
        return r.json().then(function (j) { if (!r.ok) { var e2 = new Error(j.error || r.status); e2.code = r.status; throw e2; } return j; });
      });
  }
  function loadQuiz() {
    return api("GET").then(function (j) {
      QUIZ = j.links || {}; OK = true;
      $("tokstate").innerHTML = '<span class="ok">✓ Log masuk sebagai ' + esc(j.user) + " — boleh simpan</span>";
    }).catch(function (e) {
      OK = false; $("tokstate").innerHTML = '<span class="err">Tidak boleh simpan: ' + esc(e.message) + "</span>";
    });
  }

  function current(rid) { var e = EDIT[rid] || {}, q = QUIZ[rid] || {}; return { k1: e.k1 != null ? e.k1 : (q.k1 || ""), k2: e.k2 != null ? e.k2 : (q.k2 || "") }; }
  function dirtyCount() { return Object.keys(EDIT).length; }
  function refreshSave() { var n = dirtyCount(); $("save").textContent = "Simpan (" + n + ")"; $("save").disabled = !n || !OK; }

  function filtered() {
    var fs = $("fsub").value, ft = $("ftyp").value, fy = $("fyear").value, fst = $("fstate").value, terms = norm($("fq").value).split(/\s+/).filter(Boolean);
    var has = $("fhas").checked, no = $("fno").checked;
    return ROWS.filter(function (r) {
      if (fs && r.s !== fs) return false; if (ft && r.t !== ft) return false;
      if (fy && String(r.y) !== fy) return false; if (fst && r.st !== fst) return false;
      var c = current(r.id), hasQ = !!(c.k1 || c.k2);
      if (has && !hasQ) return false; if (no && hasQ) return false;
      if (terms.length) { var hay = r._t + " " + norm(c.k1 + " " + c.k2); for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false; }
      return true;
    });
  }
  function chips(ls) { return ls.map(function (l) { return '<a class="c c-' + l[2] + '" href="' + esc(l[1]) + '" target="_blank" rel="noopener" title="' + esc(l[1]) + '">' + esc(l[0]) + "</a>"; }).join(""); }

  function render() {
    var list = filtered(), show = list.slice(0, LIMIT);
    $("info").textContent = list.length + " baris sepadan" + (list.length > LIMIT ? " — memaparkan " + LIMIT + " pertama, tapis lagi untuk lihat yang lain." : ".");
    $("tb").innerHTML = show.map(function (r) {
      var c = current(r.id), al = [];
      if (c.k1) al.push(["Allite K1 Online Quiz", c.k1, "allite"]); if (c.k2) al.push(["Allite K2 Online Quiz", c.k2, "allite"]);
      return '<tr data-id="' + r.id + '" class="' + (EDIT[r.id] ? "dirty " : "") + (c.k1 || c.k2 ? "has" : "") + '">' +
        '<td class="lab"><b>' + esc(r.sn) + " · " + esc(r.y || "") + '</b>' + esc(r.l) + '<br><small>' + esc(r.tn) + (r.st ? " · " + esc(r.st) : "") + ' · <a href="' + esc(r.p) + '#r-' + r.id + '" target="_blank">lihat di laman ↗</a></small></td>' +
        "<td>" + chips(r.k) + (al.length ? "<br>" + chips(al) : "") + "</td>" +
        '<td class="q"><input type="url" data-k="k1" placeholder="Pautan Allite K1 quiz (kosong = tiada butang)" value="' + esc(c.k1) + '">' +
        '<input type="url" data-k="k2" placeholder="Pautan Allite K2 quiz (kosong = tiada butang)" value="' + esc(c.k2) + '"></td>' +
        '<td class="src"><a href="' + esc(r.src) + '" target="_blank" rel="noopener">' + esc(r.src.replace(/^https?:\/\//, "")) + "</a></td></tr>";
    }).join("");
    var total = ROWS.length, withQ = ROWS.filter(function (r) { var c = current(r.id); return c.k1 || c.k2; }).length;
    $("counts").innerHTML = "<span class='pill'>" + total + " baris</span><span class='pill'>" + withQ + " ada quiz</span>";
    refreshSave();
  }

  $("tb").addEventListener("input", function (e) {
    var inp = e.target; if (!inp.dataset.k) return;
    var tr = inp.closest("tr"), id = tr.dataset.id, q = QUIZ[id] || {}, v = inp.value.trim();
    EDIT[id] = EDIT[id] || {}; EDIT[id][inp.dataset.k] = v;
    var c = current(id);
    if ((c.k1 || "") === (q.k1 || "") && (c.k2 || "") === (q.k2 || "")) delete EDIT[id];
    tr.classList.toggle("dirty", !!EDIT[id]); refreshSave();
    inp.style.borderColor = v && !/^https?:\/\//.test(v) ? "#b91c1c" : "";
  });

  $("save").addEventListener("click", function () {
    var bad = Object.keys(EDIT).filter(function (id) { var e = EDIT[id]; return [e.k1, e.k2].some(function (v) { return v && !/^https?:\/\//.test(v); }); });
    if (bad.length) { status("Ada pautan tidak sah (mesti bermula dengan https://)", "err"); return; }
    $("save").disabled = true; status("Menyimpan…");
    api("POST", { changes: EDIT }).then(function (j) {
      Object.keys(EDIT).forEach(function (id) {
        var c = Object.assign({}, QUIZ[id] || {}, EDIT[id]);
        Object.keys(c).forEach(function (k) { if (!c[k]) delete c[k]; });
        if (Object.keys(c).length) QUIZ[id] = c; else delete QUIZ[id];
      });
      EDIT = {};
      status("✓ Disimpan (" + j.saved + "). Butang Allite sudah muncul di laman.", "ok"); render();
    }).catch(function (e) { status("Gagal simpan: " + e.message, "err"); refreshSave(); });
  });

  $("csv").addEventListener("click", function () {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = [["id", "subjek", "jenis", "tahun", "negeri", "baris", "butang", "pautan", "allite_k1", "allite_k2", "sumber"].join(",")];
    filtered().forEach(function (r) {
      var c = current(r.id);
      r.k.forEach(function (l) { lines.push([r.id, r.sn, r.tn, r.y, r.st, r.l, l[0], l[1], c.k1, c.k2, r.src].map(q).join(",")); });
    });
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv" }));
    a.download = "spmtrial-pautan.csv"; a.click();
  });

  ["fsub", "ftyp", "fyear", "fstate", "fhas", "fno"].forEach(function (id) { $(id).addEventListener("change", render); });
  var tm; $("fq").addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(render, 150); });
  window.addEventListener("beforeunload", function (e) { if (dirtyCount()) { e.preventDefault(); e.returnValue = ""; } });

  status("Memuatkan data…");
  fetch("rows.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
    ROWS = d.rows; ROWS.forEach(function (r) { r._t = norm([r.sn, r.tn, r.y, r.st, r.l, r.src, r.k.map(function (l) { return l[0] + " " + l[1]; }).join(" ")].join(" ")); });
    var opt = function (sel, arr, def) { $(sel).insertAdjacentHTML("beforeend", arr.map(function (a) { return '<option value="' + esc(a[0]) + '"' + (a[0] === def ? " selected" : "") + ">" + esc(a[1]) + "</option>"; }).join("")); };
    opt("fsub", d.subjects);
    $("ftyp").innerHTML = '<option value="">Semua jenis</option>'; opt("ftyp", d.types, "percubaan");
    opt("fyear", d.years.map(function (y) { return [String(y), String(y)]; }));
    opt("fstate", d.states.map(function (s) { return [s, s]; }));
    return loadQuiz();
  }).then(function () { status(""); render(); }).catch(function (e) { status("Ralat: " + e.message, "err"); });
})();
