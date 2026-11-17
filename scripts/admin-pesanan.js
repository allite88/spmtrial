// Admin tab "Pesanan": print orders from /cetak/ (stored by the worker as KV "order:*").
// "Jana PDF cetakan" builds one print-ready file in the browser with pdf-lib:
//   A4 landscape, 2 PDF pages per side (left & right), every paper starts on a new sheet (blank back added when needed),
//   a cover sheet with the order number first. Print double-sided, flip on short edge.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var rm = function (sen) { return "RM" + ((sen || 0) / 100).toFixed(2); };
  var ORD = null, loading = false;
  var NEXT = { baru: "dibayar", dibayar: "dicetak", dicetak: "dihantar" };
  var LABEL = { baru: "Baru", dibayar: "Dibayar", dicetak: "Dicetak", dihantar: "Dihantar", batal: "Batal" };

  function state(t, cls) { $("ord-state").innerHTML = '<span class="' + (cls || "muted") + '">' + t + "</span>"; }
  function api(opt) {
    return fetch("../admin/api/pesanan", Object.assign({ credentials: "same-origin", cache: "no-store" }, opt || {})).then(function (r) {
      var ct = r.headers.get("content-type") || "";
      if (!ct.includes("json")) throw new Error(r.status === 200 ? "Sesi tamat — muat semula halaman untuk log masuk" : "HTTP " + r.status);
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; });
    });
  }
  function post(body) { return api({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  function badge() { var n = ORD.filter(function (o) { return o.status === "baru"; }).length; $("ord-badge").textContent = n ? n : ""; }
  function when(at) { var d = new Date(at); return isNaN(d) ? "" : d.toLocaleString("ms-MY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }

  function draw() {
    var f = $("ord-f").value, q = $("ord-q").value.trim().toLowerCase().replace(/^#/, "");
    var L = ORD.filter(function (o) {
      if (f === "aktif" ? ["baru", "dibayar", "dicetak"].indexOf(o.status) < 0 : f && o.status !== f) return false;
      if (q && (o.no + " " + o.items.map(function (i) { return i.name; }).join(" ")).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    $("ord-count").textContent = ORD.length + " pesanan" + (L.length !== ORD.length ? " (" + L.length + " dipapar)" : "");
    $("ord-list").innerHTML = L.length ? L.map(function (o) {
      var rows = "";
      o.items.forEach(function (it, i) {
        it.files.forEach(function (f, j) {
          rows += "<tr><td>" + (j ? "" : "<b>" + (i + 1) + ". " + esc(it.name) + "</b>") + "</td><td>" +
            '<a href="https://drive.google.com/file/d/' + esc(f.d) + '/view" target="_blank" rel="noopener">' + esc(f.t) + " ↗</a></td>" +
            '<td class="n">' + f.p + " ms</td><td class=\"n\">" + f.m + " muka</td><td class=\"n\">" + (f.h || Math.ceil(f.p / 4)) + " helai</td></tr>";
        });
      });
      var nx = NEXT[o.status];
      return '<div class="ord st-' + esc(o.status) + '" data-no="' + esc(o.no) + '"><div class="ord-top"><div><b class="ord-no">#' + esc(o.no) + "</b> " +
        '<span class="tag">' + esc(LABEL[o.status] || o.status) + '</span> <span class="muted">' + esc(when(o.at)) + "</span></div>" +
        "<div><b>" + rm(o.jumlah) + '</b> <span class="muted">(' + o.helai + " helai " + rm(o.cetak) + " + pos " + rm(o.pos) + ")</span></div></div>" +
        "<table>" + rows + "</table>" +
        '<textarea rows="2" placeholder="Nota (nama, alamat, no. tracking…)" data-nota>' + esc(o.nota || "") + "</textarea>" +
        '<div class="ord-act"><button class="pri" data-a="pdf">🖨 Jana PDF cetakan</button>' +
        (nx ? '<button data-a="' + nx + '">→ ' + LABEL[nx] + "</button>" : "") +
        '<select data-a="set">' + Object.keys(LABEL).map(function (k) { return '<option value="' + k + '"' + (k === o.status ? " selected" : "") + ">" + LABEL[k] + "</option>"; }).join("") + "</select>" +
        '<button data-a="nota">Simpan nota</button><button class="del" data-a="delete">Padam</button> <span class="ord-prog muted"></span></div></div>';
    }).join("") : '<p class="muted">Tiada pesanan' + (f === "aktif" ? " aktif" : "") + ".</p>";
  }

  function find(no) { return ORD.filter(function (o) { return o.no === no; })[0]; }
  function setStatus(o, st, el) {
    el.disabled = true;
    return post({ no: o.no, status: st }).then(function () { o.status = st; badge(); draw(); state("✓ #" + esc(o.no) + " → " + LABEL[st], "ok"); })
      .catch(function (err) { state("Gagal: " + esc(err.message), "err"); el.disabled = false; });
  }

  $("ord-list").addEventListener("click", function (e) {
    var a = e.target.getAttribute && e.target.getAttribute("data-a"); if (!a || a === "set") return;
    var card = e.target.closest(".ord"), o = find(card.dataset.no); if (!o) return;
    if (a === "pdf") return makePdf(o, e.target, card.querySelector(".ord-prog"));
    if (a === "nota") {
      var t = card.querySelector("[data-nota]").value; e.target.disabled = true;
      return post({ no: o.no, nota: t }).then(function () { o.nota = t; state("✓ Nota disimpan", "ok"); }).catch(function (err) { state("Gagal: " + esc(err.message), "err"); }).then(function () { e.target.disabled = false; });
    }
    if (a === "delete") {
      if (!confirm("Padam pesanan #" + o.no + " selama-lamanya?")) return;
      e.target.disabled = true;
      return post({ no: o.no, action: "delete" }).then(function () { ORD = ORD.filter(function (x) { return x !== o; }); badge(); draw(); state("✓ Dipadam", "ok"); })
        .catch(function (err) { state("Gagal: " + esc(err.message), "err"); e.target.disabled = false; });
    }
    if (LABEL[a]) setStatus(o, a, e.target);
  });
  $("ord-list").addEventListener("change", function (e) {
    if (e.target.getAttribute("data-a") !== "set") return;
    var o = find(e.target.closest(".ord").dataset.no); if (o && e.target.value !== o.status) setStatus(o, e.target.value, e.target);
  });
  $("ord-f").addEventListener("change", draw);
  $("ord-q").addEventListener("input", draw);
  $("ord-reload").addEventListener("click", function () { ORD = null; window.ordLoad(); });

  // ---- print-ready PDF
  var W = 841.89, H = 595.28;   // A4 landscape (points)
  function txt(s) { return String(s).replace(/→/g, "->").replace(/[—–]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, ""); }

  function makePdf(o, btn, prog) {
    if (!window.PDFLib) { state("pdf-lib tidak dimuatkan — semak sambungan internet", "err"); return; }
    var P = window.PDFLib, errs = [];
    btn.disabled = true;
    var out, font, bold;
    var step = function (t) { prog.textContent = t; };
    P.PDFDocument.create().then(function (d) {
      out = d;
      return Promise.all([out.embedFont(P.StandardFonts.Helvetica), out.embedFont(P.StandardFonts.HelveticaBold)]);
    }).then(function (f) {
      font = f[0]; bold = f[1];
      // cover sheet (+ blank back so the first paper starts on a new sheet)
      var pg = out.addPage([W, H]), y = H - 60;
      pg.drawText("SPMTrial - Pesanan cetakan", { x: 50, y: y, size: 14, font: font }); y -= 36;
      pg.drawText("#" + o.no, { x: 50, y: y, size: 34, font: bold }); y -= 30;
      pg.drawText(txt(when(o.at) + "   |   " + o.helai + " helai   |   Jumlah " + rm(o.jumlah) + " (cetakan " + rm(o.cetak) + " + pos " + rm(o.pos) + ")"), { x: 50, y: y, size: 11, font: font }); y -= 30;
      o.items.forEach(function (it, i) {
        if (y < 150) return;
        pg.drawText(txt((i + 1) + ". " + it.name), { x: 50, y: y, size: 12, font: bold }); y -= 16;
        pg.drawText(txt("    " + it.files.map(function (f) { return f.t + " (" + f.p + " ms, " + (f.h || Math.ceil(f.p / 4)) + " helai)"; }).join("   ")), { x: 50, y: y, size: 10, font: font }); y -= 20;
      });
      var ny = 120;
      ["Nama:", "Alamat:", "", "No. telefon:"].forEach(function (l) { pg.drawText(l, { x: 50, y: ny, size: 11, font: font }); pg.drawLine({ start: { x: 130, y: ny - 2 }, end: { x: W - 50, y: ny - 2 }, thickness: 0.5 }); ny -= 24; });
      out.addPage([W, H]);
      // every paper, in order
      var files = [];
      o.items.forEach(function (it) { it.files.forEach(function (f) { files.push({ it: it, f: f }); }); });
      return files.reduce(function (chain, x, k) {
        return chain.then(function () {
          step("Memuat " + (k + 1) + "/" + files.length + ": " + x.it.name + " - " + x.f.t + "…");
          return fetch("../admin/api/pdf?id=" + encodeURIComponent(x.f.d), { credentials: "same-origin" })
            .then(function (r) { if (!r.ok || !/pdf/.test(r.headers.get("content-type") || "")) throw new Error("HTTP " + r.status); return r.arrayBuffer(); })
            .then(function (buf) { return P.PDFDocument.load(buf, { ignoreEncryption: true }); })
            .then(function (src) { return out.embedPages(src.getPages()); })
            .then(function (pages) {
              var sides = 0, label = txt("#" + o.no + "  " + x.it.name + "  -  " + x.f.t);
              for (var i = 0; i < pages.length; i += 2) {
                var pg = out.addPage([W, H]); sides++;
                [pages[i], pages[i + 1]].forEach(function (ep, s) {
                  if (!ep) return;
                  var bw = W / 2 - 16, bh = H - 26, sc = Math.min(bw / ep.width, bh / ep.height);
                  var w = ep.width * sc, h = ep.height * sc;
                  pg.drawPage(ep, { x: s * W / 2 + 8 + (bw - w) / 2, y: 18 + (bh - h) / 2, width: w, height: h });
                });
                pg.drawText(label + "   (" + (i + 1) + (pages[i + 1] ? "-" + (i + 2) : "") + "/" + pages.length + ")", { x: 10, y: 6, size: 6, font: font });
              }
              if (sides % 2) out.addPage([W, H]);   // blank back: next paper starts on a fresh sheet
              if (pages.length !== x.f.p) errs.push(x.it.name + " - " + x.f.t + ": " + pages.length + " ms (dijangka " + x.f.p + ")");
            })
            .catch(function (err) {
              errs.push(x.it.name + " - " + x.f.t + ": GAGAL (" + err.message + ")");
              var pg = out.addPage([W, H]);
              pg.drawText(txt("GAGAL MUAT: " + x.it.name + " - " + x.f.t), { x: 50, y: H / 2 + 20, size: 18, font: bold });
              pg.drawText("Muat turun manual: https://drive.google.com/file/d/" + x.f.d + "/view", { x: 50, y: H / 2 - 10, size: 11, font: font });
              out.addPage([W, H]);
            });
        });
      }, Promise.resolve());
    }).then(function () {
      step("Menyimpan PDF…");
      return out.save();
    }).then(function (bytes) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      a.download = "cetak-" + o.no + ".pdf"; document.body.appendChild(a); a.click(); a.remove();
      var sheets = out.getPageCount() / 2;
      step("✓ cetak-" + o.no + ".pdf · " + out.getPageCount() + " muka (" + sheets + " helai termasuk 1 helai muka depan). Cetak dua belah, flip pada tepi pendek.");
      if (errs.length) state("⚠ Semak: " + errs.map(esc).join(" · "), "err");
    }).catch(function (err) {
      step(""); state("Gagal jana PDF: " + esc(err.message), "err");
    }).then(function () { btn.disabled = false; });
  }

  window.ordLoad = function () {
    if (ORD || loading) return; loading = true; state("Memuatkan…");
    api().then(function (j) { ORD = j.orders || []; badge(); draw(); state("✓ Log masuk sebagai " + esc(j.user), "ok"); })
      .catch(function (e) { state("Tidak boleh muat: " + esc(e.message), "err"); }).then(function () { loading = false; });
  };
  setTimeout(function () { if (!ORD) window.ordLoad(); }, 600);
})();
