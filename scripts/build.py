#!/usr/bin/env python3
"""Build a static, SEO/GEO-friendly SPM resource directory from data/pages.json.

All resources are LINKS to publicly shared files (Google Drive etc.). Nothing is downloaded.
Edit SITE_URL / SITE_NAME below before deploying.
"""
import json, re, os, html, shutil, datetime
from collections import OrderedDict, defaultdict
from urllib.parse import urlparse

SITE_URL = os.environ.get("SITE_URL", "https://www.contoh-spm.com").rstrip("/")   # set by GitHub Actions
BASE = urlparse(SITE_URL).path.rstrip("/")   # e.g. "/arkib-spm" on GitHub Pages project sites
SITE_NAME = "Arkib SPM"
SITE_TAGLINE = "Semua bahan SPM dalam satu tempat — tersusun ikut subjek, tahun dan negeri"
TODAY = datetime.date.today().isoformat()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "pages.json")
OUT = os.path.join(ROOT, "site")

# ---------------------------------------------------------------- taxonomy
# (slug, display name, english/alt name, category, match regexes, exclude regexes)
SUBJECTS = [
    ("addmath", "Matematik Tambahan", "Additional Mathematics", "Sains & Matematik", [r"matematik tambahan", r"additional math", r"add ?maths?"], []),
    ("matematik", "Matematik", "Mathematics", "Teras", [r"matematik", r"mathematics", r"\bmaths?\b"], [r"tambahan", r"additional"]),
    ("kesusasteraan-tamil", "Kesusasteraan Tamil", "Tamil Literature", "Bahasa", [r"kesusasteraan tamil"], []),
    ("kesusasteraan-cina", "Kesusasteraan Cina", "Chinese Literature", "Bahasa", [r"kesusasteraan cina"], []),
    ("kmk", "Kesusasteraan Melayu Komunikatif", "KMK", "Bahasa", [r"kesusasteraan melayu", r"\bkmk\b"], []),
    ("est", "English for Science and Technology", "EST", "Bahasa", [r"english for science", r"\best\b"], []),
    ("bm", "Bahasa Melayu", "Malay Language (BM)", "Teras", [r"bahasa melayu", r"\bbm\b"], []),
    ("bi", "Bahasa Inggeris", "English", "Teras", [r"bahasa inggeris", r"\benglish\b", r"speaking test"], [r"english for science"]),
    ("sejarah", "Sejarah", "History", "Teras", [r"sejarah"], []),
    ("pendidikan-moral", "Pendidikan Moral", "Moral Education", "Teras", [r"pendidikan moral"], []),
    ("pendidikan-islam", "Pendidikan Islam", "Islamic Education", "Teras", [r"pendidikan islam"], []),
    ("sains-komputer", "Sains Komputer", "Computer Science", "Sains & Matematik", [r"sains komputer"], []),
    ("sains-sukan", "Sains Sukan", "Sports Science", "Teknikal & Vokasional", [r"sains sukan"], []),
    ("srt", "Sains Rumah Tangga", "Home Science (SRT)", "Teknikal & Vokasional", [r"sains rumah tangga", r"\bsrt\b"], []),
    ("sains-tambahan", "Sains Tambahan", "Additional Science", "Sains & Matematik", [r"sains tambahan"], []),
    ("kimia", "Kimia", "Chemistry", "Sains & Matematik", [r"kimia", r"chemistry"], []),
    ("fizik", "Fizik", "Physics", "Sains & Matematik", [r"fizik", r"physics"], []),
    ("biologi", "Biologi", "Biology", "Sains & Matematik", [r"biologi", r"biology"], []),
    ("sains", "Sains", "Science", "Teras", [r"\bsains\b", r"\bscience\b"], [r"komputer", r"sukan", r"rumah tangga", r"tambahan", r"english for science"]),
    ("prinsip-perakaunan", "Prinsip Perakaunan", "Principles of Accounting", "Perdagangan & Sastera", [r"perakaunan"], []),
    ("perniagaan", "Perniagaan", "Business", "Perdagangan & Sastera", [r"perniagaan"], []),
    ("ekonomi", "Ekonomi", "Economics", "Perdagangan & Sastera", [r"ekonomi"], []),
    ("geografi", "Geografi", "Geography", "Perdagangan & Sastera", [r"geografi"], []),
    ("psv", "Pendidikan Seni Visual", "Visual Arts (PSV)", "Perdagangan & Sastera", [r"seni visual", r"\bpsv\b"], []),
    ("tasawwur-islam", "Tasawwur Islam", "Tasawwur Islam", "Agama", [r"tasawwur"], []),
    ("pqs", "Pendidikan Al-Quran dan Al-Sunnah", "PQS", "Agama", [r"al-quran", r"\bpqs\b"], []),
    ("psi", "Pendidikan Syariah Islamiah", "PSI", "Agama", [r"syariah islamiah", r"\bpsi\b"], []),
    ("al-syariah", "Al-Syariah", "Al-Syariah", "Agama", [r"al[- ]syariah"], []),
    ("lam", "Al-Lughah Al-Arabiah Al-Mu'asirah", "LAM", "Agama", [r"lughah", r"\blam\b"], []),
    ("manahij", "Manahij Al-Ulum Al-Islamiah", "MUI", "Agama", [r"manahij", r"\bmui\b"], []),
    ("usul-al-din", "Usul Al-Din", "Usuluddin", "Agama", [r"usul ?al[- ]din", r"usuluddin"], []),
    ("adab-balaghah", "Al-Adab wa Al-Balaghah", "Adab wa Balaghah", "Agama", [r"adab wa", r"balaghah"], []),
    ("bahasa-arab", "Bahasa Arab", "Arabic", "Bahasa", [r"bahasa arab"], []),
    ("bahasa-cina", "Bahasa Cina", "Chinese", "Bahasa", [r"bahasa cina"], []),
    ("bahasa-tamil", "Bahasa Tamil", "Tamil", "Bahasa", [r"bahasa tamil"], []),
    ("bahasa-iban", "Bahasa Iban", "Iban", "Bahasa", [r"bahasa iban"], []),
    ("gkt", "Grafik Komunikasi Teknikal", "GKT", "Teknikal & Vokasional", [r"grafik komunikasi", r"\bgkt\b"], []),
    ("pertanian", "Pertanian", "Agriculture", "Teknikal & Vokasional", [r"pertanian"], []),
    ("reka-cipta", "Reka Cipta", "Invention", "Teknikal & Vokasional", [r"reka cipta"], []),
    ("asas-kelestarian", "Asas Kelestarian", "Sustainability", "Teknikal & Vokasional", [r"kelestarian"], []),
]
SUBJ = {s[0]: s for s in SUBJECTS}
CATEGORIES = ["Teras", "Sains & Matematik", "Perdagangan & Sastera", "Bahasa", "Agama", "Teknikal & Vokasional"]

def match_subject(text):
    t = " " + text.lower().replace("’", "'") + " "
    for slug, _n, _e, _c, inc, exc in SUBJECTS:
        if any(re.search(p, t) for p in inc) and not any(re.search(p, t) for p in exc):
            return slug
    return None

TYPES = OrderedDict([
    ("percubaan", ("Soalan Percubaan", "Kertas soalan percubaan (trial) SPM + skema jawapan, ikut tahun dan negeri")),
    ("sebenar", ("Soalan Sebenar SPM", "Kertas soalan peperiksaan sebenar SPM tahun-tahun lepas + ulasan jawapan")),
    ("nota", ("Nota Ringkas", "Nota ringkas dan padat Tingkatan 4 & 5 ikut bab")),
    ("latihan", ("Latihan & Modul", "Soalan latihan, modul, KBAT dan soalan ikut bab/topik")),
    ("bukuteks", ("Buku Teks & Jawapan", "Buku teks digital KSSM Tingkatan 4 & 5 dan jawapannya")),
    ("karangan", ("Karangan & Penulisan", "Contoh karangan dan rangka karangan")),
    ("lisan", ("Ujian Lisan / Bertutur", "Contoh soalan dan jawapan ujian lisan / speaking test")),
    ("amali", ("Ujian Amali (UAS)", "Soalan percubaan Ujian Amali Sains SPM")),
    ("teknik", ("Teknik Menjawab & Tips", "Teknik menjawab, analisis soalan, tips dan panduan")),
    ("lain", ("Lain-lain", "Bahan rujukan lain")),
])

def classify(title):
    t = title.lower()
    if re.search(r"amali|\buas\b", t): return "amali"
    if re.search(r"lisan|bertutur|speaking", t): return "lisan"
    if re.search(r"buku teks|textbook|download form", t): return "bukuteks"
    if re.search(r"analisis|teknik|tips|panduan|strategi|kata-kata kunci|kalkulator|target", t): return "teknik"
    if "sebenar" in t and "percubaan" not in t: return "sebenar"
    if "percubaan" in t and not re.search(r"ikut (bab|topik)", t): return "percubaan"
    if re.search(r"karangan|essay|writing|email", t): return "karangan"
    if re.search(r"latihan|modul|kbat|ramalan|ujian|esei|pembuktian|ikut (bab|topik)|percubaan", t): return "latihan"
    if "nota" in t: return "nota"
    return "lain"

def classify_group(text, default):
    t = text.lower()
    if re.search(r"sebenar", t): return "sebenar"
    if re.search(r"buku teks", t): return "bukuteks"
    if re.search(r"lisan|bertutur|speaking", t): return "lisan"
    if re.search(r"karangan|essay", t): return "karangan"
    if re.search(r"analisis|teknik|tips|tajuk famous|ramalan", t): return "teknik"
    if re.search(r"nota", t): return "nota"
    if re.search(r"percubaan", t): return "percubaan"
    return default

STATES = ["Perlis", "Kedah", "Pulau Pinang", "Perak", "Selangor", "Kuala Lumpur", "Putrajaya", "Negeri Sembilan",
          "Melaka", "Johor", "Pahang", "Terengganu", "Kelantan", "Sabah", "Sarawak", "Labuan", "MRSM", "SBP", "YIK"]
STATE_ALIASES = {"penang": "Pulau Pinang", "p. pinang": "Pulau Pinang", "pp": "Pulau Pinang", "n. sembilan": "Negeri Sembilan",
                 "n9": "Negeri Sembilan", "kl": "Kuala Lumpur", "wp kuala lumpur": "Kuala Lumpur", "kuantan": "Pahang",
                 "batu pahat": "Johor", "muar": "Johor", "kluang": "Johor", "kota tinggi": "Johor", "pasir gudang": "Johor",
                 "mpsm": None}

def find_state(text):
    t = text.lower()
    for s in STATES:
        if s.lower() in t: return s
    for a, s in STATE_ALIASES.items():
        if s and re.search(r"\b" + re.escape(a) + r"\b", t): return s
    return None

def find_year(*texts):
    for t in texts:
        m = re.search(r"\b(20[0-3]\d)\b", t or "")
        if m: return int(m.group(1))
    return None

# ---------------------------------------------------------------- helpers
E = lambda s: html.escape(s or "", quote=True)

def clean_url(u):
    u = u.strip().replace("&amp;", "&")
    if "drive.google.com/file/d/" in u:
        m = re.search(r"/file/d/([\w-]+)", u)
        if m: return "https://drive.google.com/file/d/%s/view" % m.group(1)
    u = re.sub(r"[?&]usp=(drive_link|sharing|drivesdk|drive_web)$", "", u)
    return u

def link_kind(text, url):
    t = text.lower(); h = urlparse(url).netloc
    if "forms.gle" in h or "/forms/" in url: return "quiz"
    if re.search(r"jawapan|skema|answer|ulasan|penyelesaian|marking", t): return "ans"
    if re.search(r"kertas|paper|soalan|\bk[123]\b", t): return "paper"
    return "doc"

def link_label(text, url):
    if text: return text
    h = urlparse(url).netloc
    if "forms.gle" in h or "/forms/" in url: return "Jawab Online (Google Form)"
    if "drive.google" in h or "docs.google" in h: return "Buka (Google Drive)"
    return "Buka pautan"

def strip_label(label, subj_slug, year):
    """'2026 Kimia Johor Batu Pahat' -> 'Johor Batu Pahat' (for display inside a subject/year block)."""
    s = label
    if year: s = re.sub(r"\b%d\b" % year, "", s)
    if subj_slug:
        _sl, name, en, *_ = SUBJ[subj_slug]
        for w in [name, en] + [x for x in re.findall(r"\(([^)]+)\)", en)]:
            s = re.sub(re.escape(w), "", s, flags=re.I)
        for p in SUBJ[subj_slug][4]:
            s = re.sub(p, "", s, flags=re.I)
    s = re.sub(r"\s{2,}", " ", s).strip(" -–:,")
    return s or label

# ---------------------------------------------------------------- collect
pages = json.load(open(DATA, encoding="utf-8"))
hub = pages.pop("__hub__")
# the hub itself is also linked under other URLs -> handle it once, via the hub-aware logic below
for _u in [u for u, p in pages.items() if p["title"] == hub["title"]]:
    pages.pop(_u)

# subject -> type -> list of blocks; block = {src_url, src_title, year, rows:[{ctx,label,state,year,links}]}
store = defaultdict(lambda: defaultdict(list))
seen = defaultdict(set)          # subject -> urls seen (dedupe)
articles = defaultdict(lambda: defaultdict(list))  # subj -> type -> [(title,url)] pages with no external file links
info_links = []

MULTI = lambda title, url: ("semua subjek" in title.lower()) or ("sebenar" in title.lower() and "tahun lepas" in title.lower()) \
    or "koleksi-bank-soalan" in url or re.search(r"amali|\buas\b", title.lower())

def add_rows(subj, typ, src_url, src_title, groups, multi=False):
    rows = []
    for g in groups:
        links = []
        for l in g["links"]:
            u = clean_url(l["u"])
            if u in seen[subj]: continue
            seen[subj].add(u)
            links.append({"t": link_label(l["t"], u), "u": u, "k": link_kind(l["t"] or g["label"], u)})
        if not links: continue
        year = find_year(g["label"], g["ctx"], g["h3"], g["h2"]) if typ in ("percubaan", "sebenar", "amali") else None
        rows.append({"h2": g["h2"], "h3": g["h3"], "ctx": g["ctx"], "label": g["label"], "year": year,
                     "state": find_state(g["label"] + " " + g["ctx"]) if typ in ("percubaan", "amali") else None,
                     "links": links})
    if rows:
        store[subj][typ].append({"src": src_url, "title": src_title, "rows": rows})

# 1) subject-specific pages
for url, p in pages.items():
    title = p["title"]
    if MULTI(title, url): continue
    subj = match_subject(title)
    if not subj:
        if p["groups"] or True: info_links.append((title, url))
        continue
    typ = classify(title)
    if sum(len(g["links"]) for g in p["groups"]) == 0:
        articles[subj][typ].append((title, url)); continue
    add_rows(subj, typ, url, title, p["groups"])
    if sum(len(g["links"]) for g in p["groups"]) <= 1 and not store[subj][typ]:
        pass

# 2) multi-subject pages: split groups by heading subject
for url, p in pages.items():
    title = p["title"]
    if not MULTI(title, url): continue
    typ = "sebenar" if "sebenar" in title.lower() else ("amali" if re.search(r"amali|uas", title.lower()) else "percubaan")
    by = defaultdict(list)
    for g in p["groups"]:
        s = match_subject(g["h2"]) or match_subject(g["h3"]) or (match_subject(g["label"]) if typ != "percubaan" else None)
        if typ == "amali": s = match_subject(g["h2"] + " " + g["h3"] + " " + g["ctx"] + " " + g["label"]) or "sains"
        if s: by[s].append(g)
    for s, gs in by.items():
        add_rows(s, typ, url, title, gs)

# 3) hub page groups (direct links under each subject heading)
for g in hub["groups"]:
    s = match_subject(g["h2"])
    if not s: continue
    typ = classify_group(" ".join([g["ctx"], g["label"]] + [l["t"] for l in g["links"][:1]]), "lain")
    add_rows(s, typ, "https://www.bumigemilang.com/soalan-percubaan-spm/", hub["title"], [g])

# ---------------------------------------------------------------- stats
def count_links(subj, typ=None):
    ts = [typ] if typ else store[subj].keys()
    return sum(len(r["links"]) for t in ts for b in store[subj].get(t, []) for r in b["rows"])

subjects_live = [s for s in SUBJECTS if count_links(s[0]) or any(articles[s[0]].values())]
TOTAL = sum(count_links(s[0]) for s in subjects_live)
trial_years = sorted({r["year"] for s in store for b in store[s].get("percubaan", []) for r in b["rows"] if r["year"]}, reverse=True)
trial_years = [y for y in trial_years if 2015 <= y <= datetime.date.today().year + 1]

# ---------------------------------------------------------------- templates
CSS = open(os.path.join(os.path.dirname(__file__), "style.css"), encoding="utf-8").read()
JS = open(os.path.join(os.path.dirname(__file__), "app.js"), encoding="utf-8").read()

def jsonld(obj):
    return '<script type="application/ld+json">%s</script>' % json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")

def breadcrumb_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE_URL + u} for i, (n, u) in enumerate(items)]}

def faq_ld(faqs):
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", a)}} for q, a in faqs]}

def page(path, title, desc, body, crumbs=None, lds=(), keywords=""):
    canon = SITE_URL + path
    crumbs_html = ""
    if crumbs:
        crumbs_html = '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + "".join(
            ('<li><a href="%s">%s</a></li>' % (E(u), E(n))) if i < len(crumbs) - 1 else '<li aria-current="page">%s</li>' % E(n)
            for i, (n, u) in enumerate(crumbs)) + "</ol></nav>"
        lds = list(lds) + [breadcrumb_ld(crumbs)]
    doc = f"""<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
{'<meta name="keywords" content="%s">' % E(keywords) if keywords else ''}
<link rel="canonical" href="{E(canon)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{E(SITE_NAME)}">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{E(canon)}">
<meta property="og:locale" content="ms_MY">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0f766e">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230f766e'/%3E%3Ctext x='16' y='22' font-size='14' font-family='Arial' font-weight='700' fill='white' text-anchor='middle'%3ESPM%3C/text%3E%3C/svg%3E">
<style>{CSS}</style>
{''.join(jsonld(x) for x in lds)}
</head>
<body>
<a class="skip" href="#main">Langkau ke kandungan</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="/"><span class="logo">SPM</span><span>{E(SITE_NAME)}</span></a>
    <form class="hsearch" action="/cari/" role="search">
      <input type="search" name="q" placeholder="Cari: kimia {trial_years[0]} johor, nota sejarah bab 3…" aria-label="Cari bahan SPM">
    </form>
    <nav class="topnav" aria-label="Utama">
      <a href="/#subjek">Subjek</a>
      <a href="/soalan-percubaan-spm-{trial_years[0]}/">Percubaan {trial_years[0]}</a>
      <a href="/soalan-sebenar-spm/">Soalan Sebenar</a>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
{crumbs_html}
{body}
</main>
<footer class="foot">
  <div class="wrap">
    <p><strong>{E(SITE_NAME)}</strong> — direktori pautan bahan SPM (soalan percubaan, soalan sebenar, nota, buku teks) yang dikongsi secara awam. Semua fail dihoskan oleh pemilik asal (kebanyakannya Google Drive); kami hanya menyusun pautan supaya lebih mudah dicari.</p>
    <p class="muted">Sumber pautan: <a href="https://www.bumigemilang.com/" rel="noopener">Bumi Gemilang</a> dan pemilik bahan masing-masing. Hak cipta bahan milik penulis / sekolah / jabatan pendidikan berkenaan. Dikemas kini {TODAY}.</p>
    <p class="muted"><a href="/">Utama</a> · <a href="/cari/">Cari</a> · <a href="/soalan-sebenar-spm/">Soalan Sebenar SPM</a> · <a href="/sitemap.xml">Sitemap</a></p>
  </div>
</footer>
<script>{JS}</script>
</body>
</html>"""
    if BASE:
        doc = doc.replace('href="/', 'href="%s/' % BASE).replace('action="/', 'action="%s/' % BASE)
    doc = doc.replace("<script>(function(){", '<script>window.BASE=%s;(function(){' % json.dumps(BASE), 1)
    fp = os.path.join(OUT, path.strip("/"), "index.html") if path.endswith("/") else os.path.join(OUT, path.strip("/"))
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    open(fp, "w", encoding="utf-8").write(doc)
    SITEMAP.append(path)

SITEMAP = []

def chips(links):
    out = []
    for l in links:
        out.append('<a class="c c-%s" href="%s" target="_blank" rel="noopener nofollow" title="%s">%s</a>' % (
            l["k"], E(l["u"]), E(l.get("full") or l["t"]), E(l["t"])))
    return "".join(out)

# ---- tidy layout: chapter table / aligned grid -------------------------------
CHAP_RE = re.compile(r"(?:\b(?:T|Tingkatan|Form|F)\s*([45])\b[\s,–-]*)?\b(?:Bab|Chapter|Topik|Topic|Unit)\s*(\d{1,2})\b", re.I)
FORM_RE = re.compile(r"\b(?:T|Tingkatan|Form|F)\s*([45])\b", re.I)
ROLE_WORDS = r"soalan|skema(?: jawapan)?|jawapan(?: lengkap)?|answers?|questions?|full solutions?|nota|notes"
SUBJ_WORDS = sorted({w for s in SUBJECTS for w in (s[1], s[2])} | {"KSSM", "SPM"}, key=len, reverse=True)

def _clean(s):
    s = re.sub(r"\[\d+\]", "", s)
    s = re.sub(r"\(\s*\)", "", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip(" -–:,.;|")

def _strip_ctx(s):
    for w in SUBJ_WORDS:
        s = re.sub(r"\b" + re.escape(w) + r"\b", "", s, flags=re.I)
    s = re.sub(r"\b(?:Tingkatan|Form|T|F)\s*[45]\b", "", s, flags=re.I)
    return _clean(s)

def _topic(text, m):
    after = text[m.end():]
    after = re.sub(r"\((?:%s)\)" % ROLE_WORDS, "", after, flags=re.I)
    after = re.sub(r"[-–:]\s*(?:%s)\s*$" % ROLE_WORDS, "", after, flags=re.I)
    after = re.sub(r"\(.*?\)|\[.*?\]", "", after)
    after = re.sub(r"^\s*(?:%s)\b" % ROLE_WORDS, "", after, flags=re.I)
    after = _strip_ctx(after)
    after = _clean(re.sub(r"^\+\s*", "", after))
    if re.fullmatch(r"(?:\+|&|dan|%s|\s)*" % ROLE_WORDS, after, flags=re.I): return ""
    return after if re.search(r"[A-Za-z]{3}", after) and len(after) <= 45 else ""

def _short(text, m, topic, kind):
    s = text[:m.start()] + " " + text[m.end():]
    if topic: s = re.sub(re.escape(topic), "", s, flags=re.I)
    s = _strip_ctx(s)
    s = re.sub(r"^\((%s)\)" % ROLE_WORDS, r"\1", s, flags=re.I)
    s = _clean(s)
    if not s:
        s = {"ans": "Jawapan", "paper": "Soalan", "quiz": "Kuiz"}.get(kind, "Buka")
    return s[:1].upper() + s[1:]

def common_prefix_strip(links):
    texts = [l["t"] for l in links]
    if len(texts) < 3: return links
    words = [t.split() for t in texts]
    n = 0
    while all(len(w) > n + 1 for w in words) and len({w[n].lower() for w in words}) == 1: n += 1
    if n < 2: return links
    return [dict(l, t=_clean(" ".join(w[n:])) or l["t"], full=l["t"]) for l, w in zip(links, words)]

def shorten_grid(links, chap_m=None):
    out = []
    for l in links:
        t = l["t"]
        if chap_m:
            t = re.sub(r"\b(?:Bab|Chapter|Topik)\s*%s\b" % chap_m.group(2), "", t, flags=re.I)
            tp = _topic(chap_m.string, chap_m)
            if tp and len(_clean(re.sub(re.escape(tp), "", t, flags=re.I))) >= 3:
                t = re.sub(re.escape(tp), "", t, flags=re.I)
            t = re.sub(r"^\s*\((%s)\)" % ROLE_WORDS, r"\1", _clean(t), flags=re.I)
        t = _strip_ctx(t)
        out.append(dict(l, t=t if len(t) >= 3 else l["t"], full=l["t"]))
    seen = defaultdict(int)
    for o in out: seen[o["t"].lower()] += 1
    out = [o if seen[o["t"].lower()] == 1 else dict(o, t=_clean(re.sub(r"\[\d+\]", "", o["full"]))) for o in out]
    return common_prefix_strip(out) if not chap_m else out

def layout(r):
    """Return ('inline', links) | ('grid', links) | ('chap', [(key, topic, links)], rest)."""
    links = r["links"]
    ms = [CHAP_RE.search(l["t"]) if len(CHAP_RE.findall(l["t"])) == 1 else None for l in links]
    hit = [m for m in ms if m]
    _rt = " ".join([r["label"], r["ctx"], r["h3"] if not r["label"] else ""])
    single = CHAP_RE.search(_rt) if len(CHAP_RE.findall(_rt)) == 1 else None   # row is already about one chapter
    if not single and len(links) >= 4 and len(hit) >= 0.7 * len(links) and len({int(m.group(2)) for m in hit}) >= 2:
        row_form = FORM_RE.search(r["label"] + " " + r["ctx"])
        chaps = OrderedDict(); rest = []
        for l, m in zip(links, ms):
            if not m: rest.append(l); continue
            form = m.group(1) or (FORM_RE.search(l["t"]).group(1) if FORM_RE.search(l["t"]) else None)
            key = ((form if not row_form else None), int(m.group(2)))
            chaps.setdefault(key, []).append((l, m))
        fs = {k[0] for k in chaps} - {None}
        if len(fs) == 1:   # merge "Bab 1" with "T5 Bab 1" when only one form is present
            f1 = fs.pop(); merged = OrderedDict()
            for k, v in chaps.items(): merged.setdefault((f1, k[1]), []).extend(v)
            chaps = merged
            if row_form: chaps = OrderedDict(((None, k[1]), v) for k, v in chaps.items())
        out = []
        forms = {k[0] for k in chaps}
        for key, items in chaps.items():
            topics = [t for t in (_topic(l["t"], m) for l, m in items) if t]
            topic = sorted(topics, key=lambda t: (-topics.count(t), len(t)))[0] if topics else ""
            name = ("T%s " % key[0] if key[0] and len(forms) > 1 or (key[0] and not row_form) else "") + "Bab %d" % key[1]
            short = [dict(l, t=_short(l["t"], m, topic, l["k"]), full=l["t"]) for l, m in items]
            if any(x["k"] == "ans" for x in short):
                short = [dict(x, t="Soalan", k="paper") if x["t"] == "Buka" else x for x in short]
            short.sort(key=lambda x: {"paper": 0, "doc": 1, "ans": 2, "quiz": 3}[x["k"]])
            out.append((name, topic, short))
        return ("chap", out, shorten_grid(rest) if rest else [])
    if len(links) >= 5 or any(len(l["t"]) > 40 for l in links):
        return ("grid", shorten_grid(links, single))
    return ("inline", links)

def links_html(r):
    lay = layout(r)
    if lay[0] == "inline":
        return '<div class="rc">%s</div>' % chips(lay[1])
    if lay[0] == "grid":
        return '<div class="rc rc-grid">%s</div>' % chips(lay[1])
    rows = "".join('<div class="ch"><div class="chn"><b>%s</b>%s</div><div class="chl">%s</div></div>' % (
        E(n), (" " + E(t)) if t else "", chips(ls)) for n, t, ls in lay[1])
    rest = ('<div class="rc rc-grid">%s</div>' % chips(lay[2])) if lay[2] else ""
    return '<div class="rc rc-chap">%s%s</div>' % (rows, rest)

def layout_json(r):
    lay = layout(r)
    pack = lambda ls: [[l["t"], l["u"], l["k"]] for l in ls]
    if lay[0] == "chap":
        return ["c", [[n, t, pack(ls)] for n, t, ls in lay[1]], pack(lay[2])]
    return [lay[0][0], pack(lay[1])]

def row_html(r, subj, year_ctx=None, show_label=None):
    label = show_label if show_label is not None else (r["label"] or r["ctx"] or r["h3"] or r["h2"])
    label = label.strip(" :")
    disp = strip_label(label, subj, year_ctx) if year_ctx else label
    attrs = ' data-y="%s" data-s="%s"' % (r["year"] or "", E(r["state"] or ""))
    return '<div class="row"%s><div class="rl" title="%s">%s</div>%s</div>' % (
        attrs, E(label), E(disp) if disp else "&nbsp;", links_html(r))

def render_generic(blocks, subj):
    """Render blocks from source pages: heading per source, sub-heading per h2/h3/ctx change."""
    out = []
    for b in blocks:
        out.append('<div class="src"><h3>%s</h3>' % E(re.sub(r"[~_%]+$|\s*\[\d\]$|\(PU\)$", "", b["title"]).strip()))
        last = None
        for r in b["rows"]:
            sub = " › ".join(x for x in [r["h2"] if r["h2"] != b["title"] else "", r["h3"], r["ctx"]] if x)
            sub = re.sub(r"\s+", " ", sub)
            if sub and sub != last:
                out.append('<h4 class="sub">%s</h4>' % E(sub)); last = sub
            out.append(row_html(r, subj))
        out.append('<p class="srcl">Sumber: <a href="%s" target="_blank" rel="noopener">%s</a></p></div>' % (E(b["src"]), E(urlparse(b["src"]).netloc)))
    return "".join(out)

def render_by_year(blocks, subj, typ):
    by = defaultdict(list)
    for b in blocks:
        for r in b["rows"]:
            by[r["year"] or 0].append(r)
    out = []
    years = sorted(by, reverse=True)
    for i, y in enumerate(years):
        rows = by[y]
        n = sum(len(r["links"]) for r in rows)
        yname = ("SPM %d" % y) if y else "Tahun lain / koleksi"
        out.append('<details class="yr" data-year="%s"%s><summary><span>%s %s</span><em>%d pautan</em></summary><div class="rows">' % (
            y or "", " open" if i < 2 else "", E(TYPES[typ][0]), yname, n))
        last = None
        for r in rows:
            if r["ctx"] and r["ctx"] != last and not find_state(r["ctx"]) and not re.match(r"^\d{4}\b", r["ctx"]):
                out.append('<h4 class="sub">%s</h4>' % E(r["ctx"])); last = r["ctx"]
            out.append(row_html(r, subj, year_ctx=y or None))
        out.append("</div></details>")
    srcs = OrderedDict((b["src"], 1) for b in blocks)
    out.append('<p class="srcl">Sumber: %s</p>' % ", ".join('<a href="%s" target="_blank" rel="noopener">%s</a>' % (
        E(u), E(urlparse(u).path.strip("/") or urlparse(u).netloc)) for u in srcs))
    return "".join(out)

# ---------------------------------------------------------------- build
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
search_index = []

def subj_faq(slug):
    _s, name, en, *_ = SUBJ[slug]
    yrs = sorted({r["year"] for b in store[slug].get("percubaan", []) for r in b["rows"] if r["year"]}, reverse=True)
    states = sorted({r["state"] for b in store[slug].get("percubaan", []) for r in b["rows"] if r["state"]})
    faqs = []
    if yrs:
        faqs.append((f"Di mana boleh dapat soalan percubaan SPM {yrs[0]} {name} beserta skema jawapan?",
                     f"Halaman {name} di {SITE_NAME} menyenaraikan pautan terus ke kertas soalan percubaan SPM {name} ({en}) "
                     f"dari tahun {yrs[-1]} hingga {yrs[0]}, termasuk skema jawapan, disusun ikut tahun dan negeri"
                     + (f" seperti {', '.join(states[:6])}" if states else "") + ". Klik nama kertas untuk membuka fail di Google Drive."))
    if store[slug].get("sebenar"):
        faqs.append((f"Adakah soalan sebenar SPM {name} tahun lepas tersedia?",
                     f"Ya. Bahagian Soalan Sebenar SPM mengandungi pautan ke kertas peperiksaan sebenar SPM {name} tahun-tahun lepas, kebanyakannya dengan ulasan atau contoh jawapan."))
    if store[slug].get("nota") or store[slug].get("bukuteks"):
        faqs.append((f"Ada nota ringkas dan buku teks {name} Tingkatan 4 dan 5?",
                     f"Ada. Bahagian Nota Ringkas dan Buku Teks & Jawapan memautkan nota ikut bab serta buku teks digital KSSM {name} Tingkatan 4 dan 5."))
    faqs.append(("Perlukah saya mendaftar atau membayar untuk muat turun?",
                 "Tidak. Semua pautan ialah fail yang dikongsi secara awam oleh pemilik asal. Ia dibuka terus di Google Drive atau laman asal tanpa pendaftaran."))
    return faqs, yrs, states

for s in subjects_live:
    slug, name, en, cat = s[0], s[1], s[2], s[3]
    total = count_links(slug)
    faqs, yrs, states = subj_faq(slug)
    types_present = [t for t in TYPES if store[slug].get(t) or articles[slug].get(t)]
    yr_txt = f"{yrs[-1]}–{yrs[0]}" if yrs else ""
    h1 = f"{name} SPM: Soalan Percubaan{' ' + str(yrs[0]) if yrs else ''}, Soalan Sebenar, Nota & Buku Teks"
    desc = (f"{total} pautan bahan SPM {name} ({en}) tersusun: soalan percubaan {yr_txt} + skema jawapan ikut negeri, "
            f"soalan sebenar SPM, nota ringkas, latihan dan buku teks Tingkatan 4 & 5. Buka terus di Google Drive.")
    tabs = "".join('<a href="#%s">%s <em>%d</em></a>' % (t, TYPES[t][0], count_links(slug, t) + len(articles[slug].get(t, []))) for t in types_present)
    body = [f'<h1>{E(h1)}</h1>',
            f'<p class="lead">Koleksi <strong>{total}</strong> pautan bahan <strong>{E(name)}</strong> ({E(en)}) untuk calon SPM — '
            + (f'soalan percubaan dari <strong>{yrs[-1]}</strong> hingga <strong>{yrs[0]}</strong>' if yrs else 'bahan rujukan')
            + (f' daripada {len(states)} negeri/institusi' if states else '')
            + '. Klik butang untuk buka fail terus. <span class="legend"><i class="c c-paper">Kertas</i><i class="c c-ans">Jawapan</i><i class="c c-quiz">Kuiz online</i><i class="c c-doc">Bahan</i></span></p>',
            f'<nav class="tabs" aria-label="Bahagian">{tabs}</nav>',
            '<div class="filters" data-filters><input type="search" placeholder="Tapis dalam halaman ini (cth: johor, bab 3, kertas 2)" aria-label="Tapis">']
    if yrs:
        body.append('<select data-fy aria-label="Tahun"><option value="">Semua tahun</option>%s</select>' % "".join('<option>%d</option>' % y for y in yrs))
    if states:
        body.append('<select data-fs aria-label="Negeri"><option value="">Semua negeri</option>%s</select>' % "".join('<option>%s</option>' % E(x) for x in states))
    body.append('<span class="fcount" data-fcount></span></div>')
    for t in types_present:
        n = count_links(slug, t)
        body.append(f'<section id="{t}" class="sec"><h2>{E(TYPES[t][0])} {E(name)} SPM</h2><p class="muted">{E(TYPES[t][1])}.</p>')
        if t in ("percubaan", "sebenar", "amali"):
            body.append(render_by_year(store[slug][t], slug, t) if store[slug].get(t) else "")
        else:
            body.append(render_generic(store[slug].get(t, []), slug))
        if articles[slug].get(t):
            body.append('<div class="src"><h3>Artikel penuh</h3>' + "".join(
                '<div class="row"><div class="rl">%s</div><div class="rc"><a class="c c-doc" href="%s" target="_blank" rel="noopener">Baca di laman asal</a></div></div>' % (E(ti), E(u))
                for ti, u in articles[slug][t]) + "</div>")
        body.append("</section>")
    body.append('<section class="sec faq"><h2>Soalan Lazim</h2>' + "".join(
        f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in faqs) + "</section>")
    related = [x for x in subjects_live if x[3] == cat and x[0] != slug][:8]
    if related:
        body.append('<section class="sec"><h2>Subjek berkaitan</h2><div class="grid sm">' + "".join(
            f'<a class="card" href="/spm/{x[0]}/"><b>{E(x[1])}</b><span>{count_links(x[0])} pautan</span></a>' for x in related) + "</div></section>")
    path = f"/spm/{slug}/"
    lds = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": h1, "description": desc, "url": SITE_URL + path,
            "inLanguage": "ms-MY", "dateModified": TODAY, "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": SITE_URL + "/"},
            "about": {"@type": "Thing", "name": f"{name} SPM ({en})"},
            "audience": {"@type": "EducationalAudience", "educationalRole": "student"},
            "educationalLevel": "SPM (Sijil Pelajaran Malaysia), Tingkatan 4 & 5"},
           faq_ld(faqs)]
    kw = f"soalan percubaan spm {name.lower()}, {name.lower()} spm, skema jawapan {name.lower()}, trial spm {en.lower()}, nota {name.lower()} tingkatan 4, nota {name.lower()} tingkatan 5, buku teks {name.lower()}"
    page(path, f"{name} SPM — Soalan Percubaan {yrs[0] if yrs else ''} + Skema Jawapan, Nota, Buku Teks | {SITE_NAME}".replace("  ", " "),
         desc, "\n".join(body), crumbs=[("Utama", "/"), ("Subjek", "/#subjek"), (name, path)], lds=lds, keywords=kw)
    # search index
    for t in store[slug]:
        for b in store[slug][t]:
            for r in b["rows"]:
                lab = (r["label"] or r["ctx"] or r["h3"] or r["h2"]).strip(" :")
                ctx = r["ctx"].strip(" :")
                full = (ctx + " › " + lab) if ctx and ctx != lab else lab
                search_index.append([slug, t, r["year"] or 0, full,
                                     " ".join(l["t"] for l in r["links"]), layout_json(r)])

# ---- year pages
for y in trial_years:
    path = f"/soalan-percubaan-spm-{y}/"
    rows_by_subj = []
    for s in subjects_live:
        rs = [r for b in store[s[0]].get("percubaan", []) for r in b["rows"] if r["year"] == y]
        if rs: rows_by_subj.append((s, rs))
    total = sum(len(r["links"]) for _, rs in rows_by_subj for r in rs)
    h1 = f"Soalan Percubaan SPM {y} + Skema Jawapan (Semua Subjek)"
    desc = f"{total} pautan kertas soalan percubaan (trial) SPM {y} dan skema jawapan untuk {len(rows_by_subj)} subjek, disusun ikut subjek dan negeri. Buka terus di Google Drive."
    toc = "".join(f'<a href="#{s[0]}">{E(s[1])} <em>{sum(len(r["links"]) for r in rs)}</em></a>' for s, rs in rows_by_subj)
    body = [f"<h1>{E(h1)}</h1>",
            f'<p class="lead">Himpunan <strong>{total}</strong> pautan soalan percubaan SPM {y} untuk <strong>{len(rows_by_subj)}</strong> subjek. Pilih subjek di bawah atau gunakan penapis.</p>',
            f'<nav class="tabs wrapw" aria-label="Subjek">{toc}</nav>',
            '<div class="filters" data-filters><input type="search" placeholder="Tapis (cth: kimia johor, kertas 2)" aria-label="Tapis">',
            '<select data-fs aria-label="Negeri"><option value="">Semua negeri</option>%s</select><span class="fcount" data-fcount></span></div>' % "".join('<option>%s</option>' % x for x in STATES)]
    for s, rs in rows_by_subj:
        body.append(f'<details class="yr" id="{s[0]}" open><summary><span>{E(s[1])} — Percubaan SPM {y}</span><em>{sum(len(r["links"]) for r in rs)} pautan</em></summary><div class="rows">')
        body.extend(row_html(r, s[0], year_ctx=y) for r in rs)
        body.append(f'<p class="srcl"><a href="/spm/{s[0]}/#percubaan">Semua tahun untuk {E(s[1])} →</a></p></div></details>')
    yl = " · ".join(f'<a href="/soalan-percubaan-spm-{x}/">{x}</a>' for x in trial_years if x != y)
    body.append(f'<p class="muted">Tahun lain: {yl}</p>')
    faqs = [(f"Bilakah soalan percubaan SPM {y} dikeluarkan?",
             f"Peperiksaan percubaan SPM biasanya diadakan oleh jabatan pendidikan negeri, MRSM dan SBP beberapa bulan sebelum SPM. Pautan di halaman ini ditambah apabila kertas dan skema jawapan dikongsi secara awam."),
            (f"Subjek apa yang ada untuk percubaan SPM {y}?", f"Terdapat {len(rows_by_subj)} subjek termasuk " + ", ".join(s[1] for s, _ in rows_by_subj[:10]) + ".")]
    body.append('<section class="sec faq"><h2>Soalan Lazim</h2>' + "".join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in faqs) + "</section>")
    page(path, f"Soalan Percubaan SPM {y} + Skema Jawapan Semua Subjek (Trial) | {SITE_NAME}", desc, "\n".join(body),
         crumbs=[("Utama", "/"), (f"Percubaan SPM {y}", path)],
         lds=[{"@context": "https://schema.org", "@type": "CollectionPage", "name": h1, "description": desc, "url": SITE_URL + path, "inLanguage": "ms-MY", "dateModified": TODAY}, faq_ld(faqs)],
         keywords=f"soalan percubaan spm {y}, trial spm {y}, skema jawapan percubaan spm {y}, soalan trial spm {y} semua subjek")

# ---- soalan sebenar page
path = "/soalan-sebenar-spm/"
rows_by_subj = [(s, [r for b in store[s[0]].get("sebenar", []) for r in b["rows"]]) for s in subjects_live]
rows_by_subj = [x for x in rows_by_subj if x[1]]
total = sum(len(r["links"]) for _, rs in rows_by_subj for r in rs)
body = ["<h1>Soalan Sebenar SPM Tahun Lepas + Jawapan (Semua Subjek)</h1>",
        f'<p class="lead"><strong>{total}</strong> pautan kertas peperiksaan sebenar SPM untuk <strong>{len(rows_by_subj)}</strong> subjek, kebanyakannya dengan ulasan atau contoh jawapan.</p>',
        '<nav class="tabs wrapw">' + "".join(f'<a href="#{s[0]}">{E(s[1])}</a>' for s, _ in rows_by_subj) + "</nav>",
        '<div class="filters" data-filters><input type="search" placeholder="Tapis (cth: 2024, kertas 2)" aria-label="Tapis"><span class="fcount" data-fcount></span></div>']
for s, rs in rows_by_subj:
    body.append(f'<details class="yr" id="{s[0]}" open><summary><span>{E(s[1])} — Soalan Sebenar SPM</span><em>{sum(len(r["links"]) for r in rs)} pautan</em></summary><div class="rows">')
    body.extend(row_html(r, s[0]) for r in rs)
    body.append("</div></details>")
desc = f"{total} pautan soalan peperiksaan sebenar SPM tahun-tahun lepas untuk {len(rows_by_subj)} subjek, dengan ulasan jawapan. Bahasa Melayu, English, Sejarah, Matematik, Sains dan lain-lain."
page(path, f"Soalan Sebenar SPM Tahun Lepas + Jawapan Semua Subjek | {SITE_NAME}", desc, "\n".join(body),
     crumbs=[("Utama", "/"), ("Soalan Sebenar SPM", path)],
     lds=[{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Soalan Sebenar SPM", "description": desc, "url": SITE_URL + path, "inLanguage": "ms-MY"}],
     keywords="soalan sebenar spm, soalan spm tahun lepas, kertas spm sebenar, jawapan soalan sebenar spm")

# ---- search page + index
os.makedirs(os.path.join(OUT, "cari"), exist_ok=True)
json.dump({"s": {s[0]: [s[1], s[2]] for s in subjects_live}, "t": {k: v[0] for k, v in TYPES.items()}, "r": search_index},
          open(os.path.join(OUT, "cari", "index.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
page("/cari/", f"Cari Bahan SPM — Soalan Percubaan, Nota, Buku Teks | {SITE_NAME}",
     f"Cari antara {TOTAL} pautan bahan SPM ikut subjek, tahun, negeri dan jenis bahan.",
     '<h1>Cari bahan SPM</h1><div class="bigsearch"><input id="q" type="search" autofocus placeholder="cth: kimia %d johor jawapan"' % trial_years[0] + ' aria-label="Kata carian">'
     '<select id="qt" aria-label="Jenis"><option value="">Semua jenis</option>' + "".join(f'<option value="{k}">{E(v[0])}</option>' for k, v in TYPES.items()) + '</select></div>'
     '<p class="muted" id="qinfo">Taip sekurang-kurangnya 2 huruf. Gunakan beberapa kata untuk carian lebih tepat.</p><div id="results" class="rows"></div>',
     crumbs=[("Utama", "/"), ("Cari", "/cari/")])

# ---- home
cards = []
for cat in CATEGORIES:
    ss = [s for s in subjects_live if s[3] == cat]
    if not ss: continue
    cards.append(f'<h3 class="cat">{E(cat)}</h3><div class="grid">' + "".join(
        f'<a class="card" href="/spm/{s[0]}/"><b>{E(s[1])}</b><small>{E(s[2])}</small><span>{count_links(s[0])} pautan</span></a>' for s in ss) + "</div>")
home_faqs = [
    ("Apakah " + SITE_NAME + "?", f"{SITE_NAME} ialah direktori percuma yang menyusun {TOTAL}+ pautan bahan SPM yang dikongsi secara awam — soalan percubaan (trial) {trial_years[-1]}–{trial_years[0]} dengan skema jawapan, soalan sebenar SPM, nota ringkas, latihan dan buku teks Tingkatan 4 & 5 — ikut subjek, tahun dan negeri."),
    ("Bagaimana cara mencari soalan percubaan SPM ikut negeri?", "Buka halaman subjek, kemudian pilih tahun dan negeri pada penapis. Setiap baris memaparkan butang Kertas 1, Kertas 2 dan Jawapan yang dibuka terus di Google Drive."),
    ("Adakah bahan ini percuma?", "Ya. Semua pautan adalah fail yang dikongsi secara awam oleh pemilik asal. Tiada pendaftaran atau bayaran diperlukan."),
    ("Berapa banyak subjek SPM yang ada?", f"{len(subjects_live)} subjek SPM, termasuk subjek teras, sains, perdagangan, bahasa, agama dan teknikal/vokasional."),
]
body = f"""
<section class="hero">
  <h1>Bahan SPM lengkap: Soalan Percubaan {trial_years[0]}, Soalan Sebenar, Nota &amp; Buku Teks</h1>
  <p class="lead">{E(SITE_TAGLINE)}. <strong>{TOTAL:,}</strong> pautan untuk <strong>{len(subjects_live)}</strong> subjek — klik terus, tiada iklan pop-up, tiada pendaftaran.</p>
  <form class="bigsearch" action="/cari/" role="search"><input type="search" name="q" placeholder="Cari subjek, tahun, negeri… cth: sejarah 2025 kedah" aria-label="Cari"><button>Cari</button></form>
  <div class="quick">
    <a href="/soalan-percubaan-spm-{trial_years[0]}/">📝 Percubaan SPM {trial_years[0]}</a>
    <a href="/soalan-percubaan-spm-{trial_years[1]}/">📝 Percubaan SPM {trial_years[1]}</a>
    <a href="/soalan-sebenar-spm/">📄 Soalan Sebenar SPM</a>
    <a href="/cari/?t=nota">📚 Nota Ringkas</a>
    <a href="/cari/?t=bukuteks">📘 Buku Teks</a>
  </div>
</section>
<section id="subjek" class="sec"><h2>Pilih subjek</h2>{''.join(cards)}</section>
<section class="sec"><h2>Soalan percubaan ikut tahun</h2><div class="grid sm">{''.join(f'<a class="card" href="/soalan-percubaan-spm-{y}/"><b>SPM {y}</b><span>Semua subjek</span></a>' for y in trial_years)}</div></section>
<section class="sec"><h2>Info penting SPM</h2><div class="src">{''.join(
    '<div class="row"><div class="rl">%s</div><div class="rc">%s<a class="c c-doc" href="%s" target="_blank" rel="noopener">Halaman asal</a></div></div>' % (
        E(re.sub(r"[~_]+$", "", t)), chips([{"t": link_label(l["t"], clean_url(l["u"])), "u": clean_url(l["u"]), "k": "doc"} for g in pages[u]["groups"] for l in g["links"]][:4]), E(u))
    for t, u in info_links if pages[u]["groups"] or "jadual" in u or "doa" in u)}</div></section>
<section class="sec faq"><h2>Soalan Lazim</h2>{''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in home_faqs)}</section>
"""
page("/", f"Soalan Percubaan SPM {trial_years[0]} + Skema Jawapan, Soalan Sebenar, Nota SPM | {SITE_NAME}",
     f"Direktori bahan SPM tersusun: {TOTAL:,} pautan soalan percubaan {trial_years[-1]}–{trial_years[0]} + skema jawapan ikut negeri, soalan sebenar SPM, nota ringkas dan buku teks untuk {len(subjects_live)} subjek.",
     body, lds=[{"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME, "url": SITE_URL + "/", "inLanguage": "ms-MY",
                 "potentialAction": {"@type": "SearchAction", "target": SITE_URL + "/cari/?q={search_term_string}", "query-input": "required name=search_term_string"}},
                {"@context": "https://schema.org", "@type": "Organization", "name": SITE_NAME, "url": SITE_URL + "/"},
                faq_ld(home_faqs)],
     keywords=f"soalan percubaan spm {trial_years[0]}, trial spm, skema jawapan spm, soalan sebenar spm, nota spm, buku teks tingkatan 4, buku teks tingkatan 5")

# ---- 404
page("/404.html", f"Halaman tidak dijumpai | {SITE_NAME}", "Halaman tidak dijumpai.",
     '<h1>Halaman tidak dijumpai</h1><p><a href="/">Kembali ke utama</a> atau <a href="/cari/">cari bahan</a>.</p>')
SITEMAP.remove("/404.html")

# ---- sitemap, robots, llms.txt
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for p_ in SITEMAP:
    pr = "1.0" if p_ == "/" else ("0.9" if "percubaan" in p_ else "0.8")
    sm.append(f"<url><loc>{SITE_URL}{p_}</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>{pr}</priority></url>")
sm.append("</urlset>")
open(os.path.join(OUT, "sitemap.xml"), "w").write("\n".join(sm))
open(os.path.join(OUT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\nDisallow: /cari/index.json\n\nSitemap: {SITE_URL}/sitemap.xml\n")
llms = [f"# {SITE_NAME}", "", f"> {SITE_TAGLINE}. Direktori percuma {TOTAL} pautan bahan SPM (Sijil Pelajaran Malaysia) yang dikongsi secara awam: soalan percubaan (trial) {trial_years[-1]}–{trial_years[0]} dengan skema jawapan ikut negeri, soalan sebenar SPM, nota ringkas, latihan dan buku teks KSSM Tingkatan 4 & 5.", "",
        "## Halaman utama", f"- [Soalan Sebenar SPM]({SITE_URL}/soalan-sebenar-spm/): kertas peperiksaan sebenar SPM tahun lepas, semua subjek"]
llms += [f"- [Soalan Percubaan SPM {y}]({SITE_URL}/soalan-percubaan-spm-{y}/): trial SPM {y} + skema jawapan, semua subjek" for y in trial_years]
llms += ["", "## Subjek"]
for s in subjects_live:
    yrs = sorted({r["year"] for b in store[s[0]].get("percubaan", []) for r in b["rows"] if r["year"]})
    llms.append(f"- [{s[1]} ({s[2]})]({SITE_URL}/spm/{s[0]}/): {count_links(s[0])} pautan" + (f"; percubaan {yrs[0]}–{yrs[-1]}" if yrs else "") +
                "; " + ", ".join(TYPES[t][0] for t in TYPES if store[s[0]].get(t)))
open(os.path.join(OUT, "llms.txt"), "w").write("\n".join(llms) + "\n")

print(f"Built {len(SITEMAP)} pages, {TOTAL} links, {len(subjects_live)} subjects, years {trial_years}")
for s in subjects_live:
    print(f"  {s[0]:20} {count_links(s[0]):5}  " + " ".join(f"{t}:{count_links(s[0], t)}" for t in TYPES if store[s[0]].get(t)))
print("unmatched pages:", len(info_links))
for t, u in info_links: print("   ", t[:70], u)
