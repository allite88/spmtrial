#!/usr/bin/env python3
"""One command to refresh the whole site.

    python3 scripts/update.py            # crawl Bumi Gemilang again (~6 min), then rebuild
    python3 scripts/update.py --offline  # rebuild from the last crawl only (no network)

Steps:
  1. Fetch the SPM hub page and re-discover every SPM sub-page it links to (so new 2027/2028
     pages are picked up automatically).
  2. Fetch each sub-page (HTML only, 1 request/second). Nothing is downloaded from Google Drive.
  3. Extract links -> data/pages.json, and write a change report (new / removed links).
  4. Rebuild the static site into site/.
"""
import json, os, re, subprocess, sys, time, datetime, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
RAW, RAW2 = os.path.join(DATA, "raw"), os.path.join(DATA, "raw2")
HUB = "https://www.bumigemilang.com/soalan-percubaan-spm/"
UA = {"User-Agent": "Mozilla/5.0 (compatible; spm-directory-updater)"}
DELAY = 1.0

def fetch(url, path):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    open(path, "wb").write(data)
    return len(data)

def fname(u):
    return re.sub(r"https?://www\.bumigemilang\.com/", "", u).rstrip("/").replace("/", "_") + ".html"

def discover(hub_html):
    """Same rule as the first build: every internal bumigemilang link inside the hub's content,
    before the comments section, except category pages."""
    s = hub_html[hub_html.find('class="entry-content'):]
    for stop in ['class="entry-footer', 'id="comments"']:
        j = s.find(stop)
        if j > 0: s = s[:j]
    urls = []
    for u in re.findall(r'href="(https?://www\.bumigemilang\.com/[^"#]+)', s):
        u = re.sub(r"(%20)+$", "", u.strip())
        if "/category/" in u or "/wp-content/" in u: continue
        if not u.endswith("/"): u += "/"
        if u not in urls: urls.append(u)
    return urls

def link_set(path):
    if not os.path.exists(path): return set()
    d = json.load(open(path, encoding="utf-8"))
    return {l["u"] for p in d.values() for g in p["groups"] for l in g["links"]}

def main():
    offline = "--offline" in sys.argv
    os.makedirs(RAW, exist_ok=True); os.makedirs(RAW2, exist_ok=True)
    urls_file = os.path.join(DATA, "urls.txt")
    if not offline:
        print("1/4 Hub:", HUB)
        fetch(HUB, os.path.join(RAW, "soalan-percubaan-spm.html"))
        urls = discover(open(os.path.join(RAW, "soalan-percubaan-spm.html"), encoding="utf-8", errors="ignore").read())
        old = set(open(urls_file).read().split()) if os.path.exists(urls_file) else set()
        new_pages = [u for u in urls if u not in old]
        open(urls_file, "w").write("\n".join(urls))
        print(f"    {len(urls)} sub-pages ({len(new_pages)} new)")
        for u in new_pages[:30]: print("     +", u)
        print("2/4 Crawling sub-pages (1 req/s)…")
        fails = 0
        for i, u in enumerate(urls, 1):
            try: fetch(u, os.path.join(RAW2, fname(u)))
            except Exception as e:
                fails += 1; print("    ! gagal:", u, e)
            if i % 25 == 0: print(f"    {i}/{len(urls)}")
            time.sleep(DELAY)
        if fails: print(f"    {fails} page(s) failed — old copies kept where available")
    else:
        print("Offline: using cached pages in data/raw*")

    print("3/4 Extracting links…")
    pages_json = os.path.join(DATA, "pages.json")
    before = link_set(pages_json)
    subprocess.run([sys.executable, os.path.join(HERE, "extract.py"), DATA, pages_json, urls_file], check=True)
    after = link_set(pages_json)
    added, removed = sorted(after - before), sorted(before - after)
    rep = os.path.join(DATA, f"changes-{datetime.date.today().isoformat()}.txt")
    with open(rep, "w") as f:
        f.write(f"+{len(added)} new links, -{len(removed)} removed\n\n[NEW]\n" + "\n".join(added) + "\n\n[REMOVED]\n" + "\n".join(removed) + "\n")
    print(f"    +{len(added)} new, -{len(removed)} removed  -> {os.path.relpath(rep, ROOT)}")
    if before and len(removed) > 0.3 * len(before):
        print("    ⚠ More than 30% of links disappeared — the source site may have changed layout. Stopping (old site stays online).")
        if "--force" not in sys.argv: sys.exit(2)

    print("4/4 Building site…")
    subprocess.run([sys.executable, os.path.join(HERE, "build.py")], check=True)
    ping_indexnow()
    print("Done. Upload the site/ folder to your host.")

def ping_indexnow():
    """Tell Bing (and other IndexNow engines) which pages exist, so new trial papers get indexed fast.
    Bing's index also feeds ChatGPT search, Copilot and DuckDuckGo. Never fails the update."""
    try:
        import json, re, urllib.request
        cfg = json.load(open(os.path.join(ROOT, "config.json")))
        key, site = cfg.get("indexnow_key"), cfg.get("site_url", "").rstrip("/")
        if not key or not site: return
        xml = open(os.path.join(ROOT, "site", "sitemap.xml"), encoding="utf-8").read()
        urls = re.findall(r"<loc>([^<]+)</loc>", xml)[:10000]
        body = json.dumps({"host": site.split("//")[1], "key": key, "keyLocation": f"{site}/{key}.txt", "urlList": urls}).encode()
        req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"content-type": "application/json; charset=utf-8"})
        print("    IndexNow:", urllib.request.urlopen(req, timeout=30).status, f"({len(urls)} URLs)")
    except Exception as e:
        print("    IndexNow skipped:", e)

if __name__ == "__main__":
    main()
