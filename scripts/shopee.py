#!/usr/bin/env python3
"""Shopee mass-upload listings for the printed trial papers.
    python3 scripts/shopee.py                       # images + shopee/shopee-listings.xlsx
    python3 scripts/shopee.py --template FILE.xlsx  # also fill Shopee's own mass-upload template -> shopee/shopee-upload.xlsx
One product per subject + year; one variation option per paper set (state / school), price = A4 sheets x RM0.20.
Reads site/cetak.json + site/admin/rows.json (run build.py first). Images go to shopee/img/ and are served at
https://spmtrial.com/shopee/img/ (build.py copies them)."""
import json, os, re, sys, math, collections
from PIL import Image, ImageDraw, ImageFont
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shopee")
IMG = os.path.join(OUT, "img")
IMG_URL = "https://spmtrial.com/shopee/img/"
SEN = 20            # sen per A4 sheet
DTS = 10            # pre-order days
STOCK = 999
MAX_OPT = 50        # Shopee MY: options per variation tier
DESC_MAX = 3000

EN = {"Matematik Tambahan": "Add Maths", "Matematik": "Maths", "Bahasa Melayu": "BM", "Bahasa Inggeris": "English",
      "Sejarah": "History", "Kimia": "Chemistry", "Fizik": "Physics", "Biologi": "Biology", "Sains": "Science",
      "Prinsip Perakaunan": "Akaun", "Perniagaan": "Business", "Ekonomi": "Economics", "Sains Komputer": "Computer Science",
      "Pendidikan Islam": "PI", "Pendidikan Moral": "Moral", "Bahasa Cina": "Chinese", "Bahasa Arab": "Arabic",
      "Geografi": "Geography", "Bahasa Tamil": "Tamil", "Sains Tambahan": "Additional Science"}
SHORT = {"Matematik Tambahan": "Add Maths", "Prinsip Perakaunan": "Perakaunan", "Pendidikan Syariah Islamiah": "PSI",
         "Al-Lughah Al-Arabiah Al-Mu'asirah": "Bahasa Arab Tinggi (LAM)", "Pendidikan Al-Quran dan Al-Sunnah": "PQS",
         "Manahij Al-Ulum Al-Islamiah": "Manahij", "Kesusasteraan Melayu Komunikatif": "KMK",
         "Grafik Komunikasi Teknikal": "GKT", "Pendidikan Seni Visual": "PSV"}
COLORS = [("#1d4ed8", "#dbeafe"), ("#047857", "#d1fae5"), ("#b91c1c", "#fee2e2"), ("#7c3aed", "#ede9fe"),
          ("#c2410c", "#ffedd5"), ("#0e7490", "#cffafe"), ("#a21caf", "#fae8ff"), ("#4d7c0f", "#ecfccb")]
FONT_B = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_R = "/System/Library/Fonts/Supplemental/Arial.ttf"
ABBR = [("Negeri Sembilan", "N. Sembilan"), ("Kuala Lumpur", "KL"), ("Pulau Pinang", "P. Pinang"), ("Johor Bahru", "JB"),
        ("Kota Kinabalu", "KK"), ("Pasir Gudang", "P. Gudang"), ("Tingkatan", "Ting."), ("Putrajaya", "Putrajaya")]

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
def helai(p): return math.ceil(p / 4)
def rm(sen): return "%.2f" % (sen / 100)

def opt_name(label, subj, year):
    s = label
    for pre in (str(year) + " ", subj + " ", subj):
        if s.startswith(pre): s = s[len(pre):]
    s = s.replace(subj, "").strip(" -–()") or label
    s = re.sub(r"\((\d)\)", r"\1", s).strip()
    for a, b in ABBR:
        if len(s) > 20: s = s.replace(a, b)
    return s[:20].strip()

def font(path, size): return ImageFont.truetype(path, size)

def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur)
    return lines

def cover(path, subj, year, n, i):
    dark, light = COLORS[i % len(COLORS)]
    im = Image.new("RGB", (1000, 1000), light); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1000, 170], fill=dark)
    d.text((500, 88), "KERTAS PERCUBAAN SPM", font=font(FONT_B, 62), fill="white", anchor="mm")
    d.text((500, 285), str(year), font=font(FONT_B, 170), fill=dark, anchor="mm")
    f = font(FONT_B, 78)
    lines = wrap(d, subj, f, 900)
    if len(lines) > 2: f = font(FONT_B, 56); lines = wrap(d, subj, f, 900)
    y = 470 - (len(lines) - 1) * 45
    for ln in lines:
        d.text((500, y), ln, font=f, fill="#111827", anchor="mm"); y += 92
    # paper stack
    for k in range(3):
        x0, y0 = 300 + k * 22, 640 - k * 18
        d.rectangle([x0, y0, x0 + 260, y0 + 200], fill="white", outline="#9ca3af", width=3)
        for r in range(6): d.line([x0 + 25, y0 + 35 + r * 26, x0 + 235, y0 + 35 + r * 26], fill="#d1d5db", width=5)
    d.rounded_rectangle([620, 600, 960, 720], 24, fill=dark)
    d.text((790, 638), "BERCETAK A4", font=font(FONT_B, 38), fill="white", anchor="mm")
    d.text((790, 685), "+ Jawapan", font=font(FONT_B, 34), fill="white", anchor="mm")
    d.rectangle([0, 880, 1000, 1000], fill=dark)
    d.text((500, 940), "%d set pilihan negeri / sekolah  •  RM0.20 sehelai" % n, font=font(FONT_B, 40), fill="white", anchor="mm")
    im.resize((800, 800), Image.LANCZOS).save(path, "JPEG", quality=82, optimize=True)

def info_image(path):
    im = Image.new("RGB", (1000, 1000), "white"); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1000, 150], fill="#111827")
    d.text((500, 75), "FORMAT CETAKAN", font=font(FONT_B, 64), fill="white", anchor="mm")
    for side, x in (("DEPAN", 90), ("BELAKANG", 520)):
        d.text((x + 195, 210), side, font=font(FONT_B, 40), fill="#111827", anchor="mm")
        d.rectangle([x, 250, x + 390, 530], outline="#111827", width=5)
        d.line([x + 195, 250, x + 195, 530], fill="#9ca3af", width=3)
        base = 1 if side == "DEPAN" else 3
        for j in range(2):
            cx = x + 97 + j * 195
            d.rectangle([cx - 70, 275, cx + 70, 505], fill="#f3f4f6", outline="#d1d5db", width=2)
            d.text((cx, 390), str(base + j), font=font(FONT_B, 80), fill="#1d4ed8", anchor="mm")
    lines = ["1 helai A4 = 4 halaman PDF", "(2 kiri-kanan, depan & belakang)", "",
             "RM0.20 sehelai A4", "Setiap kertas dicetak berasingan", "Contoh: 31 halaman = 8 helai = RM1.60"]
    y = 600
    for ln in lines:
        if ln: d.text((500, y), ln, font=font(FONT_B if not ln.startswith("(") else FONT_R, 44), fill="#111827", anchor="mm")
        y += 62
    im.resize((800, 800), Image.LANCZOS).save(path, "JPEG", quality=82, optimize=True)

def build():
    rows = {r["id"]: r for r in json.load(open(os.path.join(ROOT, "site", "admin", "rows.json"), encoding="utf-8"))["rows"]}
    cetak = json.load(open(os.path.join(ROOT, "site", "cetak.json"), encoding="utf-8"))
    groups = collections.defaultdict(list)
    for rid, (name, sn, files) in cetak.items():
        r = rows.get(rid)
        if not r or not str(r["y"]).isdigit(): continue
        groups[(sn, int(r["y"]))].append((rid, name, files))
    os.makedirs(IMG, exist_ok=True)
    info_image(os.path.join(IMG, "format-cetakan.jpg"))
    products = []
    keys = sorted(groups, key=lambda k: (-k[1], -len(groups[k]), k[0]))
    for pi, (sn, y) in enumerate(keys):
        sets = sorted(groups[(sn, y)], key=lambda t: t[1])
        chunks = [sets[i:i + MAX_OPT] for i in range(0, len(sets), MAX_OPT)]
        for ci, chunk in enumerate(chunks):
            opts, used = [], collections.Counter()
            for rid, name, files in chunk:
                o = opt_name(name, sn, y)
                used[o] += 1
                if used[o] > 1: o = o[:16] + " (%d)" % used[o]
                h = sum(helai(f[1]) for f in files)
                opts.append({"rid": rid, "opt": o, "files": files, "helai": h, "price": h * SEN,
                             "weight": round(0.05 + h * 0.005, 2), "height": max(1, math.ceil(h / 100))})
            short = SHORT.get(sn, sn)
            en = EN.get(sn)
            suf = " (Bahagian %d)" % (ci + 1) if len(chunks) > 1 else ""
            title = "Kertas Percubaan SPM %d %s%s Bercetak A4 + Jawapan | %d Set Negeri%s" % (
                y, short, (" " + en) if en and en.lower() not in short.lower() else "", len(opts), suf)
            if len(title) > 120: title = title[:120].rstrip()
            img = "%d-%s.jpg" % (y, slug(sn)) if ci == 0 else "%d-%s-%d.jpg" % (y, slug(sn), ci + 1)
            cover(os.path.join(IMG, img), sn, y, len(opts), pi)
            products.append({"n": len(products) + 1, "sn": sn, "y": y, "title": title,
                             "sku": ("%s-%d" % (slug(short), y)).upper()[:30] + ("-%d" % (ci + 1) if ci else ""),
                             "opts": opts, "img": IMG_URL + img, "desc": desc(sn, y, opts)})
    return products

def desc(sn, y, opts):
    en = EN.get(sn)
    head = ("Kertas Percubaan SPM %d %s%s – versi BERCETAK (hardcopy), sedia untuk ulang kaji.\n"
            "Pilih set mengikut negeri / sekolah. Setiap set mengandungi kertas soalan dan jawapan / skema (jika ada).\n\n"
            "📄 FORMAT CETAKAN\n"
            "• Kertas A4, 2 halaman PDF sebelah kiri-kanan, depan & belakang (1 helai A4 = 4 halaman PDF)\n"
            "• Setiap kertas (K1, K2, Jawapan) dicetak berasingan\n"
            "• Harga ikut bilangan helai: RM0.20 sehelai A4 (helai terakhir yang separuh kosong turut dikira)\n\n"
            "📦 PILIHAN SET (%d)\n") % (y, sn, " (%s)" % en if en else "", len(opts))
    tail = ("\n⏱ PENGHANTARAN\nPre-order: siap dicetak & dipos dalam %d hari bekerja.\n\n"
            "ℹ️ NOTA\nHarga adalah untuk servis cetakan sahaja. Hak cipta soalan milik penyedia asal masing-masing "
            "(JPN, sekolah, MRSM, SBP dan lain-lain).\n\n"
            "#KertasPercubaanSPM #SPM%d #TrialSPM #SoalanPercubaanSPM #%s") % (DTS, y, re.sub(r"\W", "", en or sn))
    full = "".join("• %s – %s · %d helai · RM%s\n" % (o["opt"], ", ".join(f[0] for f in o["files"]), o["helai"], rm(o["price"])) for o in opts)
    if len(head + full + tail) > DESC_MAX:
        full = "".join("• %s · %d helai · RM%s\n" % (o["opt"], o["helai"], rm(o["price"])) for o in opts)
    if len(head + full + tail) > DESC_MAX:
        full = ", ".join(o["opt"] for o in opts) + "\n"
    return head + full + tail

COLS = ["Category", "Product Name", "Product Description", "Parent SKU", "Variation Integration No.", "Variation Name1",
        "Option for Variation 1", "Image per Variation", "Variation Name2", "Option for Variation 2", "Price", "Stock", "SKU",
        "Cover image", "Item Image 1", "Item Image 2", "Weight", "Length", "Width", "Height", "Pre-order DTS"]

def lines_for(p):
    for j, o in enumerate(p["opts"]):
        first = j == 0
        yield {"Category": "", "Product Name": p["title"], "Product Description": p["desc"] if first else "",
               "Parent SKU": p["sku"], "Variation Integration No.": p["n"], "Variation Name1": "Set",
               "Option for Variation 1": o["opt"], "Price": float(rm(o["price"])), "Stock": STOCK,
               "SKU": "%s-%s" % (p["sku"], o["rid"]), "Cover image": p["img"],
               "Item Image 1": IMG_URL + "format-cetakan.jpg", "Weight": o["weight"], "Length": 32, "Width": 23,
               "Height": o["height"], "Pre-order DTS": DTS}

def write_own(products):
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Listings"
    ws.append(COLS)
    for c in ws[1]: c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="EE4D2D")
    for p in products:
        for ln in lines_for(p): ws.append([ln.get(c, "") for c in COLS])
    for col, w in zip("ABCDEFGHIJKLMNOPQRSTU", [12, 60, 50, 22, 10, 8, 22, 8, 8, 8, 8, 7, 34, 40, 40, 10, 7, 6, 6, 6, 8]):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "B2"
    s = wb.create_sheet("Products")
    s.append(["No.", "Product Name", "Options", "Min RM", "Max RM", "Description chars", "Cover image"])
    for p in products:
        pr = [o["price"] for o in p["opts"]]
        s.append([p["n"], p["title"], len(p["opts"]), min(pr) / 100, max(pr) / 100, len(p["desc"]), p["img"]])
    f = os.path.join(OUT, "shopee-listings.xlsx"); wb.save(f); return f

def fill_template(products, tpl):
    """Fill Shopee's downloaded mass-upload template: find the row with the column titles, match by title."""
    wb = openpyxl.load_workbook(tpl); ws = wb.worksheets[0]
    hdr_row, cmap = None, {}
    for r in range(1, 10):
        vals = {str(ws.cell(r, c).value or "").strip().lower(): c for c in range(1, ws.max_column + 1)}
        if any(v.startswith("product name") for v in vals):
            hdr_row = r
            for v, c in vals.items():
                for k in COLS:
                    if v.startswith(k.lower()) and k not in cmap: cmap[k] = c
            break
    if not hdr_row: sys.exit("Could not find the 'Product Name' header row in " + tpl)
    start = ws.max_row + 1
    r = start
    for p in products:
        for ln in lines_for(p):
            for k, v in ln.items():
                if k in cmap and v != "": ws.cell(r, cmap[k], v)
            r += 1
    f = os.path.join(OUT, "shopee-upload.xlsx"); wb.save(f)
    print("template header row %d, data rows %d-%d, matched: %s" % (hdr_row, start, r - 1, ", ".join(cmap)))
    return f

if __name__ == "__main__":
    ps = build()
    print("products %d, variations %d" % (len(ps), sum(len(p["opts"]) for p in ps)))
    print(write_own(ps))
    if "--template" in sys.argv: print(fill_template(ps, sys.argv[sys.argv.index("--template") + 1]))
