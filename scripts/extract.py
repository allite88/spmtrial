import sys,json,re,os,html
from html.parser import HTMLParser
from urllib.parse import urlparse
S=sys.argv[1]; OUT=sys.argv[2]; URLS=sys.argv[3]
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.ev=[]; s.inh=None; s.ina=None; s.buf=""; s.abuf=""
    def handle_starttag(s,t,a):
        a=dict(a)
        if t in("h1","h2","h3","h4"): s.flush(); s.inh=t; s.buf=""
        elif t=="a": s.flush(); s.ina=a.get("href") or ""; s.abuf=""
        elif t in("p","li","br","div","td","tr","span") and t!="span": s.flush()
    def handle_endtag(s,t):
        if t==s.inh: s.ev.append(("h",t,re.sub(r"\s+"," ",html.unescape(s.buf)).strip())); s.inh=None; s.buf=""
        elif t=="a" and s.ina is not None: s.ev.append(("a",s.ina.strip(),re.sub(r"\s+"," ",s.abuf).strip())); s.ina=None
        elif t in("p","li","div","td"): s.flush()
    def handle_data(s,d):
        if s.inh: s.buf+=d
        elif s.ina is not None: s.abuf+=d
        else: s.buf+=d
    def flush(s):
        if s.inh: return
        t=re.sub(r"\s+"," ",s.buf).strip(); s.buf=""
        if t: s.ev.append(("t",t))
STOP=re.compile(r"^(\d+ thoughts? on|Write a Comment|Leave a Reply|Categories$|Untuk mendapatkan segala Maklumat|Related Posts)",re.I)
JUNK=re.compile(r"^[\s.,:;→>*…\-–—|/()]*$|^(dan|atau|&)$",re.I)
SKIPHOST=("facebook.com","twitter.com","x.com","whatsapp.com","t.me","telegram","pinterest","linkedin","wp.me","wordpress.com","bumigemilang.com","jetpack","gravatar","api.whatsapp")
def host(u): return urlparse(u).netloc.lower()
def parse_page(path):
    s=open(path,encoding="utf-8",errors="ignore").read()
    tm=re.search(r"<title>([^<]*)",s); title=html.unescape(tm.group(1)).replace(" - Bumi Gemilang","").strip() if tm else ""
    dm=re.search(r'<meta name="description" content="([^"]*)',s); desc=html.unescape(dm.group(1)) if dm else ""
    i=s.find('class="entry-content'); s=s[i:] if i>0 else s
    p=P(); p.feed(s); p.flush()
    groups=[]; h2=""; h3=""; label=""; ctx=""; used=True; cur=None; internal=[]
    for e in p.ev:
        if e[0]=="h":
            if STOP.search(e[2]): break
            if e[1] in("h1","h2"): h2=e[2] if not JUNK.match(e[2]) else h2; h3=""
            else: h3=e[2] if not JUNK.match(e[2]) else h3
            label=""; ctx=""; used=True; cur=None; continue
        if e[0]=="t":
            t=e[1]
            if STOP.search(t): break
            if JUNK.match(t) or t.startswith('class="') or len(t)>220: continue
            if not used and label: ctx=label
            label=t.strip(" :"); used=False; cur=None; continue
        u,txt=e[1],html.unescape(e[2])
        if not u or u.startswith("#") or u.startswith("mailto"): continue
        u=re.sub(r"(%20)+$","",u).strip()
        hs=host(u)
        if "bumigemilang.com" in hs:
            if "/category/" not in u and "#respond" not in u: internal.append({"url":u.split("#")[0],"text":txt})
            continue
        if any(k in hs for k in SKIPHOST) or not hs: continue
        if not txt or txt.startswith("http"): txt=""
        used=True
        key=(h2,h3,ctx,label)
        if cur is None or cur["key"]!=key:
            cur={"key":key,"h2":h2,"h3":h3,"ctx":ctx,"label":label,"links":[]}; groups.append(cur)
        cur["links"].append({"t":txt,"u":u})
    for g in groups: del g["key"]
    return {"title":title,"desc":desc,"groups":groups,"internal":internal}
out={}
urls=open(URLS).read().split()
for u in urls:
    f=re.sub(r"https?://www.bumigemilang.com/","",u).rstrip("/").replace("/","_")+".html"
    fp=os.path.join(S,"raw2",f)
    if os.path.exists(fp) and os.path.getsize(fp)>1000: out[u]=parse_page(fp)
out["__hub__"]=parse_page(S+"/raw/soalan-percubaan-spm.html")
json.dump(out,open(OUT,"w"),ensure_ascii=False)
n=sum(len(l["links"]) for v in out.values() for l in v["groups"])
print(len(out),"pages",n,"external links")
from collections import Counter
print(Counter(host(l["u"]) for v in out.values() for g in v["groups"] for l in g["links"]).most_common(15))
