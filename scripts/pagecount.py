#!/usr/bin/env python3
"""Count pages of the Google Drive PDFs linked from trial-paper rows (for the print service).
    python3 scripts/pagecount.py [--all] [--limit N]
Reads site/admin/rows.json, writes data/pagecount.json  {driveId: {"p": pages, "b": bytes} | {"err": "..."}}.
Already-counted ids are skipped, so it can be re-run to pick up new papers.
Tries cheap byte-range reads first (PDF head + tail); downloads the whole file only when the count is hidden."""
import json, os, re, sys, io, time, threading, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "pagecount.json")
UA = "Mozilla/5.0 (compatible; spmtrial-build/1.0; +https://spmtrial.com)"
DL = "https://drive.usercontent.google.com/download?id=%s&export=download&confirm=t"
MAX_FULL = 60 * 1024 * 1024
ID_RE = re.compile(r"drive\.google\.com/(?:file/d/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})")

def get(fid, rng=None, timeout=60):
    req = urllib.request.Request(DL % fid, headers={"User-Agent": UA, **({"Range": rng} if rng else {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get("Content-Range", ""), r.headers.get("Content-Type", "")

def count_in(buf):
    """Largest /Count of a /Type /Pages object visible in raw bytes (the root Pages tree has the total)."""
    best = 0
    for m in re.finditer(rb"/Type\s*/Pages\b", buf):
        seg = buf[max(0, m.start() - 600): m.end() + 600]
        for c in re.findall(rb"/Count\s+(\d+)", seg):
            best = max(best, int(c))
    return best

def full_count(data):
    from pypdf import PdfReader
    return len(PdfReader(io.BytesIO(data), strict=False).pages)

def probe(fid):
    try:
        head, cr, ct = get(fid, "bytes=0-4095")
        if not head.startswith(b"%PDF"):
            if b"<html" in head[:500].lower(): return {"err": "html"}   # private / deleted / quota page
            return {"err": "notpdf", "ct": ct[:40]}
        size = int(cr.rsplit("/", 1)[-1]) if "/" in cr else len(head)
        m = re.search(rb"/Linearized.{0,200}?/N\s+(\d+)", head, re.S)
        if m: return {"p": int(m.group(1)), "b": size}
        if size <= len(head):
            n = count_in(head) or full_count(head)
            return {"p": n, "b": size}
        tail, _, _ = get(fid, "bytes=-262144")
        n = count_in(tail) or count_in(head)
        if n: return {"p": n, "b": size}
        if size > MAX_FULL: return {"err": "toolarge", "b": size}
        data, _, _ = get(fid, None, timeout=180)
        return {"p": full_count(data), "b": size, "full": 1}
    except urllib.error.HTTPError as e:
        return {"err": "http%d" % e.code}
    except Exception as e:
        return {"err": type(e).__name__ + ": " + str(e)[:80]}

def main():
    allrows = "--all" in sys.argv
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0
    rows = json.load(open(os.path.join(ROOT, "site", "admin", "rows.json"), encoding="utf-8"))["rows"]
    ids = []
    seen = set()
    # newest years first so the useful ones finish early
    rows = sorted(rows, key=lambda r: -(int(r["y"]) if str(r["y"]).isdigit() else 0))
    for r in rows:
        if not allrows and r["t"] != "percubaan": continue
        for l in r["k"]:
            m = ID_RE.search(l[1])
            if m and m.group(1) not in seen:
                seen.add(m.group(1)); ids.append(m.group(1))
    res = json.load(open(OUT)) if os.path.exists(OUT) else {}
    todo = [i for i in ids if i not in res or res[i].get("err") in ("http429", "html") or "Error" in res[i].get("err", "")]
    if limit: todo = todo[:limit]
    print("%d ids, %d to do" % (len(ids), len(todo)), flush=True)
    lock = threading.Lock(); done = [0]
    def work(fid):
        r = probe(fid)
        if r.get("err") == "http429":
            time.sleep(20); r = probe(fid)
        with lock:
            res[fid] = r; done[0] += 1
            if done[0] % 200 == 0:
                json.dump(res, open(OUT, "w")); print(done[0], flush=True)
    with ThreadPoolExecutor(12) as ex: list(ex.map(work, todo))
    json.dump(res, open(OUT, "w"))
    ok = [v for v in res.values() if "p" in v]
    print("done: %d counted, %d errors, %d pages total" % (len(ok), len(res) - len(ok), sum(v["p"] for v in ok)))

if __name__ == "__main__":
    main()
