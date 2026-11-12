(function(){
// ---- Allite online quiz buttons (links managed in /admin, served by the Cloudflare worker)
var QZ={},QZP=fetch((window.BASE||"")+"/quiz-links.json",{cache:"no-cache"}).then(function(r){return r.ok?r.json():{}}).catch(function(){return {}}).then(function(j){QZ=j||{};return QZ});
function alliteFor(id){var q=QZ[id]||{},o=[];if(q.k1)o.push([q.k1b?"Allite K1 Bhg A Quiz":"Allite K1 Online Quiz",q.k1,"allite"]);if(q.k1b)o.push(["Allite K1 Bhg B Quiz",q.k1b,"allite"]);if(q.k2)o.push(["Allite K2 Online Quiz",q.k2,"allite"]);return o}
window.alliteFor=alliteFor;
QZP.then(function(){
  Object.keys(QZ).forEach(function(id){
    var row=document.getElementById("r-"+id); if(!row)return;
    var rc=row.querySelector(".rc"); if(!rc||rc.querySelector(".c-allite"))return;
    alliteFor(id).forEach(function(l){var a=document.createElement("a");a.className="c c-allite";a.href=l[1];a.target="_blank";a.rel="noopener";a.textContent=l[0];rc.appendChild(a)});
  });
});
// ---- support QR + sponsor slot (edited in /admin, served by the Cloudflare worker as /site-config.json)
(function(){
  var B=window.BASE||"",K="spmtrial-site";
  var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  var src=function(u){return /^\/media\//.test(u)?B+u:u};
  var ga=function(n,p){try{if(window.gtag)gtag("event",n,p)}catch(e){}};
  function draw(c){
    c=c||{};var s=c.support||{},pg=document.body.getAttribute("data-pg")||"other";
    var strip=document.getElementById("sup-strip"),card=document.getElementById("sup-card"),spx=document.getElementById("spx");
    var hero=document.querySelector("main .hero");if(spx&&hero&&spx.nextElementSibling!==hero.nextElementSibling&&hero.parentNode)hero.parentNode.insertBefore(spx,hero.nextSibling);
    if(strip&&card){
      if(s.on&&s.img){
        var t=esc(s.title||"Sokong SPMTrial"),tx=esc(s.text||"");
        strip.innerHTML='<div class="sup-s"><div class="wrap sup-s-in"><span>❤️ <b>'+t+'</b> <span class="sup-s-t">— laman belajar percuma &amp; bersih, dikekalkan bersama pelajar.</span></span><button type="button" class="sup-btn" data-sup>Imbas QR untuk sokong</button></div></div>';
        card.innerHTML='<section class="sup-c" id="sokong"><div class="sup-c-txt"><h2>❤️ '+t+'</h2><p>'+tx+'</p>'+(s.link?'<p><a class="sup-link" href="'+esc(s.link)+'" target="_blank" rel="noopener">Sokong melalui pautan ini ↗</a></p>':'')+(s.note?'<p class="muted">'+esc(s.note)+'</p>':'')+'</div><button type="button" class="sup-qr" data-sup aria-label="Besarkan kod QR"><img src="'+esc(src(s.img))+'" alt="Kod QR sokongan '+t+'" loading="lazy" width="180" height="180"></button></section>';
      }else{strip.innerHTML="";card.innerHTML=""}
    }
    if(spx){
      var L=(c.sponsors||[]).filter(function(x){return x.on&&x.img}),m=L.filter(function(x){return x.where===pg});
      if(!m.length)m=L.filter(function(x){return x.where==="all"||(x.where==="s:*"&&pg.indexOf("s:")===0)});
      var a=m.length?m[Math.floor(Math.random()*m.length)]:null,ph=c.placeholder||{};
      var wa=ph.wa?"https://wa.me/"+ph.wa+"?text="+encodeURIComponent(ph.waText||"Hello, I would like to advertise on the SPMTrial website. I am "):"";
      var waNum=ph.wa?ph.wa.replace(/^60/,"0").replace(/^(\d{3})(\d{3,4})(\d{4})$/,"$1-$2 $3"):"";
      var waBtn=wa?'<a class="spx-wa" href="'+esc(wa)+'" target="_blank" rel="noopener" data-wa>💬 Iklankan di sini · WhatsApp '+esc(waNum)+'</a>':"";
      if(a){
        spx.innerHTML='<div class="spx-h"><span class="adl">Iklan · Penaja</span>'+waBtn+'</div>'+(a.url?'<a href="'+esc(a.url)+'" target="_blank" rel="sponsored noopener" data-spx="'+esc(a.name||a.id)+'">':'<div>')+'<img src="'+esc(src(a.img))+'" alt="'+esc(a.name||"Iklan")+'">'+(a.url?'</a>':'</div>');
        spx.className="spx on";
      }else if(ph.on){
        spx.innerHTML='<a class="spx-ph" href="'+esc(wa||("mailto:"+(window.CONTACT||"")+"?subject=Iklan%20di%20SPMTrial"))+'"'+(wa?' target="_blank" rel="noopener" data-wa':'')+'><b>Ruang iklan</b><span>'+esc(ph.text||"Universiti / kolej / pusat tuisyen: iklankan di sini")+'</span>'+(wa?'<span class="spx-wa">💬 WhatsApp '+esc(waNum)+'</span>':'')+'</a>';
        spx.className="spx on";
      }else{spx.innerHTML="";spx.className="spx"}
    }
  }
  var cached=null;try{cached=JSON.parse(localStorage.getItem(K)||"null")}catch(e){}
  if(cached)draw(cached);
  fetch(B+"/site-config.json",{cache:"no-cache"}).then(function(r){return r.ok?r.json():null}).then(function(c){
    if(!c)return;var j=JSON.stringify(c);if(!cached||j!==JSON.stringify(cached))draw(c);try{localStorage.setItem(K,j)}catch(e){}
  }).catch(function(){});
  document.addEventListener("click",function(e){
    var q=e.target.closest&&e.target.closest("[data-sup]");
    if(q){e.preventDefault();var im=document.querySelector(".sup-qr img");if(!im)return;ga("sokong_qr",{});
      var d=document.createElement("div");d.className="sup-modal";d.innerHTML='<div class="sup-m-in"><img src="'+im.src+'" alt="'+esc(im.alt)+'"><p>Imbas dengan aplikasi bank / e-dompet anda. Terima kasih! 🙏</p><button type="button">Tutup</button></div>';
      d.addEventListener("click",function(ev){if(ev.target===d||ev.target.tagName==="BUTTON")d.remove()});document.body.appendChild(d);return}
    var s=e.target.closest&&e.target.closest("[data-spx]");if(s)ga("klik_iklan",{penaja:s.getAttribute("data-spx")});if(e.target.closest&&e.target.closest("[data-wa]"))ga("whatsapp_iklan",{});
  });
  document.addEventListener("keydown",function(e){if(e.key==="Escape"){var m=document.querySelector(".sup-modal");if(m)m.remove()}});
})();
var norm=function(s){return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")};
// ---- in-page filters
var f=document.querySelector("[data-filters]");
if(f){
  var inp=f.querySelector("input"),fy=f.querySelector("[data-fy]"),fs=f.querySelector("[data-fs]"),cnt=f.querySelector("[data-fcount]");
  var rows=[].slice.call(document.querySelectorAll("main .row"));
  rows.forEach(function(r){r._t=norm(r.textContent+" "+(r.closest("details")?r.closest("details").querySelector("summary").textContent:""))});
  var run=function(){
    var terms=norm(inp.value).split(/\s+/).filter(Boolean),y=fy?fy.value:"",s=fs?fs.value:"",shown=0,active=terms.length||y||s;
    rows.forEach(function(r){
      var ok=terms.every(function(t){return r._t.indexOf(t)>-1})&&(!y||r.dataset.y===y)&&(!s||r.dataset.s===s);
      r.classList.toggle("hide",!ok);if(ok)shown++;
    });
    document.querySelectorAll("main details.yr, main .src").forEach(function(d){
      var any=d.querySelector(".row:not(.hide)");d.classList.toggle("hide",!any&&!!active);
      if(active&&any&&d.tagName==="DETAILS")d.open=true;
    });
    document.querySelectorAll("main .sub").forEach(function(h){
      var n=h.nextElementSibling,vis=false;while(n&&n.classList.contains("row")){if(!n.classList.contains("hide")){vis=true;break}n=n.nextElementSibling}
      h.classList.toggle("hide",!vis&&!!active);
    });
    document.querySelectorAll("main section.sec[id]").forEach(function(sec){
      sec.classList.toggle("hide",!!active&&!sec.querySelector(".row:not(.hide)"));
    });
    cnt.textContent=active?shown+" baris sepadan":"";
  };
  var tm;inp.addEventListener("input",function(){clearTimeout(tm);tm=setTimeout(run,120)});
  [fy,fs].forEach(function(x){x&&x.addEventListener("change",run)});
  var q=new URLSearchParams(location.search);
  if(q.get("f")){inp.value=q.get("f");run()}
}
// ---- global search
var box=document.getElementById("q");
if(box){
  var sel=document.getElementById("qt"),out=document.getElementById("results"),info=document.getElementById("qinfo"),D=null;
  var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  var p=new URLSearchParams(location.search);box.value=p.get("q")||"";if(p.get("t"))sel.value=p.get("t");
  fetch((window.BASE||"")+"/cari/index.json").then(function(r){return r.json()}).then(function(d){
    D=d;d.r.forEach(function(r){r._t=norm(d.s[r[0]].join(" ")+" "+d.t[r[1]]+" "+(r[2]||"")+" "+r[3]+" "+r[4])});QZP.then(go);
  });
  var ch=function(ls){return ls.map(function(l){return '<a class="c c-'+l[2]+'" href="'+esc(l[1])+'" target="_blank" rel="noopener nofollow">'+esc(l[0])+'</a>'}).join("")};
  var lay=function(L){
    if(L[0]==="i")return '<div class="rc">'+ch(L[1])+'</div>';
    if(L[0]==="g")return '<div class="rc rc-grid">'+ch(L[1])+'</div>';
    return '<div class="rc rc-chap">'+L[1].map(function(c){return '<div class="ch"><div class="chn"><b>'+esc(c[0])+'</b>'+(c[1]?" "+esc(c[1]):"")+'</div><div class="chl">'+ch(c[2])+'</div></div>'}).join("")+
      (L[2].length?'<div class="rc rc-grid">'+ch(L[2])+'</div>':"")+'</div>';
  };
  var withAllite=function(h,A){return (A&&A.length)?h.slice(0,-6)+ch(A)+'</div>':h};
  var go=function(){
    if(!D)return;var terms=norm(box.value).split(/\s+/).filter(Boolean),t=sel.value;
    history.replaceState(null,"","?q="+encodeURIComponent(box.value)+(t?"&t="+t:""));
    if(!terms.length&&!t){out.innerHTML="";info.textContent="Taip sekurang-kurangnya 2 huruf. Gunakan beberapa kata untuk carian lebih tepat.";return}
    if(terms.join("").length<2&&!t){out.innerHTML="";return}
    var res=[];for(var i=0;i<D.r.length;i++){var r=D.r[i];if(t&&r[1]!==t)continue;
      if(terms.every(function(x){return r._t.indexOf(x)>-1}))res.push(r)}
    res.sort(function(a,b){return (b[2]||0)-(a[2]||0)});
    info.textContent=res.length+" hasil"+(res.length>300?" (memaparkan 300 teratas — tambah kata carian untuk tapis)":"");
    out.innerHTML=res.slice(0,300).map(function(r){
      return '<div class="row"><div class="rl"><div class="res-h"><b><a href="'+(window.BASE||"")+'/spm/'+r[0]+'/">'+esc(D.s[r[0]][0])+'</a></b> · '+esc(D.t[r[1]])+(r[2]?" · "+r[2]:"")+'</div>'+esc(r[3])+'</div>'+withAllite(lay(r[5]),alliteFor(r[6]))+'</div>'}).join("");
  };
  var tm2;box.addEventListener("input",function(){clearTimeout(tm2);tm2=setTimeout(go,150)});sel.addEventListener("change",go);
}
})();
// analytics: count which papers students open (shows up in GA4 as event "buka_fail")
document.addEventListener("click",function(e){
  var a=e.target.closest&&e.target.closest("a.c");if(!a||typeof gtag!=="function")return;
  var row=a.closest(".row"),lab=row&&row.querySelector(".rl")?row.querySelector(".rl").textContent.trim():"";
  gtag("event","buka_fail",{jenis:a.className.replace(/.*c-(\w+).*/,"$1"),label:(lab+" | "+a.textContent.trim()).slice(0,100),halaman:location.pathname});
});
