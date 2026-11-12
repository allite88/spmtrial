#!/usr/bin/env python3
"""Match Allite CSV exports to admin rows.  Usage:
    python3 scripts/match_allite.py <quiz-k1.csv> <k2.csv> <out.json> <report.csv>
Writes {rowId: {k1, k2}} for matched rows and a report of every CSV line (matched / unmatched / ambiguous)."""
import csv, json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = json.load(open(os.path.join(ROOT, "site", "admin", "rows.json"), encoding="utf-8"))["rows"]

SUBJ = {"akaun": "prinsip-perakaunan", "biologi": "biologi", "ekonomi": "ekonomi", "fizik": "fizik", "kimia": "kimia",
        "matematik": "matematik", "perniagaan": "perniagaan", "sains": "sains", "sejarah": "sejarah",
        "matematik tambahan": "addmath", "bahasa melayu": "bm", "bahasa inggeris": "bi"}
# words that only name the subject / paper, never the state
NOISE = r"\b(prinsip|perakaunan|p\.?\s*akaun|akaun|kaun|biologi|biology|bio|ekonomi|eko|fizik|physics|phy|kimia|chem|chemistry|" \
        r"matematik|mathematics|math|mm|perniagaan|perdagangan|sains|science|scien|scie|bi|sejarah|sej|kertas|k1|k2|trial|set|new|20\d\d)\b"
ALIAS = [(r"\bkl\b", "kuala lumpur"), (r"\bn9\b", "negeri sembilan"), (r"\bp\.?\s*pinang\b", "pulau pinang"),
         (r"(?<!pulau )\bpinang\b", "pulau pinang"), (r"\bterenggnu\b", "terengganu"), (r"\bjb\b", "johor bahru"),
         (r"\bjohor batu\b(?! pahat)", "johor batu pahat"), (r"\bppc 2026\b", "ppc")]

def norm(s):
    s = " " + s.lower().replace("&", " ") + " "
    for a, b in ALIAS: s = re.sub(a, b, s)
    s = re.sub(NOISE, " ", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return " ".join(s.split())

def row_key(r):
    lab = r["l"].split("›")[-1]
    return norm(lab)

cand = {}
for r in rows:
    if r["t"] != "percubaan" or not r["y"]: continue
    cand.setdefault((r["s"], int(r["y"])), []).append(r)

def match(subj, year, state):
    rs = cand.get((subj, year), [])
    k = norm(state)
    exact = [r for r in rs if row_key(r) == k]
    if exact: return exact, "exact"
    kt = set(k.split())
    # all CSV words appear in the row label and the row has nothing that contradicts (e.g. a different set number)
    sub = [r for r in rs if kt and kt <= set(row_key(r).split())]
    if len(sub) == 1: return sub, "partial"
    if len(sub) > 1:
        # prefer the plain state row (fewest extra words)
        best = min(len(set(row_key(r).split()) - kt) for r in sub)
        top = [r for r in sub if len(set(row_key(r).split()) - kt) == best]
        if len(top) == 1: return top, "partial"
        # several numbered sets (e.g. Sarawak 1/2/3, Perak (1)/(2)): plain name -> set 1
        one = [r for r in top if re.search(r"(^|\s)1$", row_key(r))]
        if len(one) == 1: return one, "semak"
        return top, "ambiguous"
    # fallbacks (marked "semak" = please double-check)
    for drop in (["johor"], ["ppc", "mpsm", "1"], ["johor", "ppc", "mpsm", "1"]):
        k2 = " ".join(w for w in k.split() if w not in drop)
        if not re.search(r"[a-z]{3}", k2) or k2 == k: continue   # must still name a place
        hits = [r for r in rs if row_key(r) == k2] or [r for r in rs if set(k2.split()) <= set(row_key(r).split())]
        if len(hits) == 1: return hits, "semak"
    return [], "none"

def suspicious(url, subj_word, state, year):
    """Flag URL slugs that clearly name another state/subject than the CSV row says."""
    slug = url.lower()
    words = {"perak", "sarawak", "selangor", "terengganu", "johor", "kedah", "kelantan", "pahang", "melaka", "perlis", "sabah"}
    st = norm(state)
    named = [w for w in words if re.search(r"\b" + w + r"\b", slug.replace("-", " "))]
    bad = [w for w in named if w not in st and not (w == "johor" and "pasir" in st)]
    other_subj = re.search(r"\b(bio|perniagaan-terengganu)\b", slug.replace("-", " ")) and subj_word not in ("Biologi",)
    msg = []
    if bad: msg.append("pautan sebut " + "/".join(bad))
    if other_subj: msg.append("pautan sebut subjek lain")
    return "; ".join(msg)

out, report = {}, []
def run(path, kind, ycol, scol, ucol, subcol):
    for line in csv.DictReader(open(path, encoding="utf-8-sig")):
        subj_word, year, state, url = line[subcol].strip(), int(line[ycol]), line[scol].strip(), line[ucol].strip()
        subj = SUBJ.get(subj_word.lower())
        hits, how = match(subj, year, state) if subj else ([], "subjek tiada")
        warn = suspicious(url, subj_word, state, year)
        if hits and how != "ambiguous":
            for r in hits:
                cur = out.setdefault(r["id"], {})
                if kind in cur and cur[kind] != url:
                    warn = (warn + "; " if warn else "") + "baris sudah ada pautan lain"
                cur[kind] = url
        report.append({"jenis": kind.upper(), "subjek": subj_word, "tahun": year, "negeri_csv": state, "status": how,
                       "baris_admin": " | ".join(r["l"] for r in hits), "id": " ".join(r["id"] for r in hits),
                       "amaran": warn, "pautan": url})

run(sys.argv[1], "k1", "年份", "州属", "URL", "科目")
run(sys.argv[2], "k2", "年份", "州属", "URL", "科目")
if len(sys.argv) > 5: run(sys.argv[5], "k1b", "年份", "州属", "URL", "科目")
json.dump(out, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
with open(sys.argv[4], "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(report[0].keys())); w.writeheader(); w.writerows(report)

from collections import Counter
for kind in ("K1", "K2", "K1B"):
    c = Counter(r["status"] for r in report if r["jenis"] == kind)
    print(kind, dict(c))
print("rows with links:", len(out))
