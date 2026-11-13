// Admin tab "Sokongan & Iklan": support QR box + sponsor/ad slots. Saved to the Cloudflare worker (KV), live on every page.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var SITE = null, SUBJ = [], DIRTY = false, OK = false;

  // ---- tabs: quiz | iklan | sendiri
  function tab(name) {
    if (["iklan", "sendiri"].indexOf(name) < 0) name = "quiz";
    $("site-panel").hidden = name !== "iklan"; $("quiz-panel").hidden = name !== "quiz"; $("own-panel").hidden = name !== "sendiri";
    ["counts", "status", "save"].forEach(function (id) { $(id).style.display = name === "quiz" ? "" : "none"; });
    [].forEach.call(document.querySelectorAll(".tabs a"), function (a) { a.classList.toggle("on", a.dataset.tab === name); });
    if (name === "iklan" && !SITE) load();
    if (name === "sendiri" && window.ownLoad) window.ownLoad();
  }
  window.addEventListener("hashchange", function () { tab(location.hash.slice(1)); });
  setTimeout(function () { tab(location.hash.slice(1)); }, 0);

  function state(t, cls) { $("site-state").innerHTML = '<span class="' + (cls || "muted") + '">' + t + "</span>"; }
  function dirty() { DIRTY = true; $("site-save").disabled = !OK; $("site-save").textContent = "Simpan & terbitkan •"; }
  function api(path, opt) {
    return fetch(path, Object.assign({ credentials: "same-origin", cache: "no-store" }, opt || {})).then(function (r) {
      var ct = r.headers.get("content-type") || "";
      if (!ct.includes("json")) throw new Error(r.status === 200 ? "Sesi tamat — muat semula halaman untuk log masuk" : "HTTP " + r.status);
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; });
    });
  }

  // ---- image upload (resizes big photos in the browser first; QR codes stay sharp)
  function upload(file, maxW) {
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) return rej(new Error("Pilih fail gambar"));
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var small = img.naturalWidth <= maxW && file.size <= 1.5 * 1024 * 1024 && /png|jpeg|webp|gif/.test(file.type);
        if (small) return res(file);
        var w = Math.min(maxW, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth);
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
        c.toBlob(function (b) { b ? res(b) : rej(new Error("Gagal proses gambar")); }, "image/jpeg", 0.88);
      };
      img.onerror = function () { rej(new Error("Gambar tidak boleh dibaca")); };
      img.src = u;
    }).then(function (blob) {
      return api("../admin/api/upload", { method: "POST", headers: { "content-type": blob.type }, body: blob });
    }).then(function (j) { return j.url; });
  }
  function bindUpload(input, maxW, done) {
    input.addEventListener("change", function () {
      var f = input.files[0]; if (!f) return;
      state("Memuat naik gambar…");
      upload(f, maxW).then(function (url) { done(url); dirty(); state("✓ Gambar dimuat naik — tekan <b>Simpan &amp; terbitkan</b>", "ok"); })
        .catch(function (e) { state("Gagal muat naik: " + esc(e.message), "err"); })
        .then(function () { input.value = ""; });
    });
  }

  // ---- support box
  function setSupImg(url) { SITE.support.img = url || ""; var p = $("sup-img-prev"); if (url) p.src = url; else p.removeAttribute("src"); $("sup-img-none").style.display = url ? "none" : ""; }
  bindUpload($("sup-img-file"), 1000, setSupImg);
  [["sup-on", "on"], ["sup-title", "title"], ["sup-text", "text"], ["sup-link", "link"], ["sup-note", "note"]].forEach(function (p) {
    $(p[0]).addEventListener("input", function () { SITE.support[p[1]] = $(p[0]).type === "checkbox" ? $(p[0]).checked : $(p[0]).value; dirty(); });
  });
  $("ph-on").addEventListener("input", function () { SITE.placeholder.on = $("ph-on").checked; dirty(); });
  $("ph-text").addEventListener("input", function () { SITE.placeholder.text = $("ph-text").value; dirty(); });
  $("ph-wa").addEventListener("input", function () { var v = $("ph-wa").value.replace(/\D/g, ""); if (/^0/.test(v)) v = "6" + v; SITE.placeholder.wa = v; dirty(); });
  $("ph-watext").addEventListener("input", function () { SITE.placeholder.waText = $("ph-watext").value; dirty(); });

  // ---- SPM community (students' group + teachers' WhatsApp)
  [["cm-on", "on"], ["cm-year", "year"], ["cm-stutext", "stuText"], ["cm-stubtn", "stuBtn"], ["cm-stulink", "stuLink"], ["cm-tchtext", "tchText"], ["cm-tchmsg", "tchMsg"]].forEach(function (p) {
    $(p[0]).addEventListener("input", function () { SITE.community[p[1]] = $(p[0]).type === "checkbox" ? $(p[0]).checked : $(p[0]).value; dirty(); });
  });
  $("cm-tchwa").addEventListener("input", function () { var v = $("cm-tchwa").value.replace(/\D/g, ""); if (/^0/.test(v)) v = "6" + v; SITE.community.tchWa = v; dirty(); });

  // ---- sponsors
  function whereOpts(sel) {
    var o = [["all", "Semua halaman"], ["home", "Laman utama sahaja"], ["s:*", "Semua halaman subjek"], ["other", "Halaman lain (tahun / negeri / panduan)"]]
      .concat(SUBJ.map(function (s) { return ["s:" + s[0], "Subjek: " + s[1]]; }));
    return o.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === sel ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("");
  }
  function drawSponsors() {
    var L = SITE.sponsors;
    $("sp-list").innerHTML = L.length ? L.map(function (s, i) {
      return '<div class="spc' + (s.on ? "" : " off") + '" data-i="' + i + '"><div class="spc-top"><label class="row1"><input type="checkbox" data-f="on"' + (s.on ? " checked" : "") + "> <b>Iklan " + (i + 1) + "</b> — aktif</label>" +
        '<button class="del" data-del>Padam</button></div><div class="ed"><div class="imgbox">' + (s.img ? '<img src="' + esc(s.img) + '" alt="">' : '<div class="muted">Tiada gambar</div>') +
        '<label class="btn">' + (s.img ? "Tukar gambar" : "Muat naik gambar") + '<input type="file" accept="image/*" hidden data-up></label></div><div class="fields">' +
        '<label>Nama penaja (untuk rekod &amp; teks alt)<input type="text" data-f="name" maxlength="120" value="' + esc(s.name) + '" placeholder="cth. Universiti ABC"></label>' +
        '<label>Klik gambar → buka pautan<input type="url" data-f="url" value="' + esc(s.url) + '" placeholder="https://www.universiti.edu.my/"></label>' +
        '<label>Papar di<select data-f="where">' + whereOpts(s.where || "all") + "</select></label></div></div></div>";
    }).join("") : '<p class="muted">Belum ada iklan. Tekan "+ Tambah iklan".</p>';
    [].forEach.call($("sp-list").querySelectorAll("[data-up]"), function (inp) {
      var i = +inp.closest(".spc").dataset.i;
      bindUpload(inp, 1600, function (url) { SITE.sponsors[i].img = url; drawSponsors(); });
    });
  }
  $("sp-list").addEventListener("input", function (e) {
    var f = e.target.dataset.f; if (!f) return;
    var card = e.target.closest(".spc"), s = SITE.sponsors[+card.dataset.i];
    s[f] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (f === "on") card.classList.toggle("off", !s.on);
    e.target.style.borderColor = f === "url" && s.url && !/^https?:\/\//.test(s.url) ? "#b91c1c" : "";
    dirty();
  });
  $("sp-list").addEventListener("click", function (e) {
    if (!e.target.hasAttribute("data-del")) return;
    var i = +e.target.closest(".spc").dataset.i;
    if (!confirm("Padam iklan " + (i + 1) + "?")) return;
    SITE.sponsors.splice(i, 1); drawSponsors(); dirty();
  });
  $("sp-add").addEventListener("click", function () {
    SITE.sponsors.push({ id: Date.now().toString(36), on: true, name: "", img: "", url: "", where: "all" }); drawSponsors(); dirty();
  });

  // ---- load / save
  function fill() {
    var s = SITE.support;
    $("sup-on").checked = !!s.on; $("sup-title").value = s.title || ""; $("sup-text").value = s.text || "";
    $("sup-link").value = s.link || ""; $("sup-note").value = s.note || ""; setSupImg(s.img);
    $("ph-on").checked = !!SITE.placeholder.on; $("ph-text").value = SITE.placeholder.text || ""; $("ph-wa").value = SITE.placeholder.wa ? SITE.placeholder.wa.replace(/^60/, "0") : ""; $("ph-watext").value = SITE.placeholder.waText || "";
    var cm = SITE.community;
    $("cm-on").checked = !!cm.on; $("cm-year").value = cm.year || ""; $("cm-stutext").value = cm.stuText || ""; $("cm-stubtn").value = cm.stuBtn || "";
    $("cm-stulink").value = cm.stuLink || ""; $("cm-tchtext").value = cm.tchText || ""; $("cm-tchwa").value = cm.tchWa ? cm.tchWa.replace(/^60/, "0") : ""; $("cm-tchmsg").value = cm.tchMsg || "";
    drawSponsors();
  }
  function load() {
    state("Memuatkan…");
    Promise.all([api("../admin/api/site"), fetch("rows.json", { cache: "force-cache" }).then(function (r) { return r.json(); }).catch(function () { return { subjects: [] }; })])
      .then(function (a) {
        var j = a[0]; SUBJ = a[1].subjects || []; OK = true;
        SITE = j.site || {};
        SITE.support = Object.assign({ on: true, title: "Sokong SPMTrial", text: "Laman ini percuma, tanpa log masuk dan tersusun kemas. Kami menjaganya bersama pelajar supaya kekal kemas dan dikemas kini. Jika laman ini membantu ulang kaji kamu, imbas kod QR untuk sokong kos penyelenggaraan — RM1 pun sangat bermakna. Terima kasih! 🙏", img: "", link: "", note: "" }, SITE.support || {});
        SITE.placeholder = Object.assign({ on: true, text: "" }, SITE.placeholder || {});
        SITE.sponsors = SITE.sponsors || [];
        SITE.community = Object.assign({ on: false, year: new Date().getFullYear() + 1, stuText: "", stuBtn: "", stuLink: "", tchText: "", tchWa: "", tchMsg: "" }, SITE.community || {});
        fill(); state("✓ Log masuk sebagai " + esc(j.user) + " — boleh simpan", "ok"); $("site-save").disabled = true;
      }).catch(function (e) { state("Tidak boleh muat: " + esc(e.message), "err"); });
  }
  $("site-save").addEventListener("click", function () {
    var bad = SITE.sponsors.filter(function (s) { return s.url && !/^https?:\/\//.test(s.url); });
    if (SITE.community.stuLink && !/^https?:\/\//.test(SITE.community.stuLink)) { state("Pautan kumpulan pelajar mesti bermula dengan https://", "err"); return; }
    if (bad.length || (SITE.support.link && !/^https?:\/\//.test(SITE.support.link))) { state("Pautan mesti bermula dengan https://", "err"); return; }
    if (SITE.support.on && !SITE.support.img) { if (!confirm("Kotak sokongan aktif tetapi tiada gambar QR — ia tidak akan dipaparkan. Simpan juga?")) return; }
    $("site-save").disabled = true; state("Menyimpan…");
    api("../admin/api/site", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(SITE) })
      .then(function () { DIRTY = false; $("site-save").textContent = "Simpan & terbitkan"; state("✓ Disimpan. Muncul di laman dalam ~1 minit.", "ok"); })
      .catch(function (e) { state("Gagal simpan: " + esc(e.message), "err"); $("site-save").disabled = false; });
  });
  window.addEventListener("beforeunload", function (e) { if (DIRTY) { e.preventDefault(); e.returnValue = ""; } });
})();
