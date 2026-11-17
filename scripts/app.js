(function(){
// ---- Allite online quiz buttons (links managed in /admin, served by the Cloudflare worker)
var QZ={},QZP=fetch((window.BASE||"")+"/quiz-links.json",{cache:"no-cache"}).then(function(r){return r.ok?r.json():{}}).catch(function(){return {}}).then(function(j){QZ=j||{};return QZ});
function alliteFor(id){var q=QZ[id]||{},o=[];if(q.k1)o.push([q.k1b?"Allite K1 Bhg A Quiz":"Allite K1 Online Quiz",q.k1,"allite"]);if(q.k1b)o.push(["Allite K1 Bhg B Quiz",q.k1b,"allite"]);if(q.k2)o.push(["Allite K2 Online Quiz",q.k2,"allite"]);if(q.s1)o.push(["K1 Step-by-step",q.s1,"allite c-step"]);if(q.s2)o.push(["K2 Step-by-step",q.s2,"allite c-step"]);return o}
window.alliteFor=alliteFor;
function applyAllite(){
  Object.keys(QZ).forEach(function(id){
    var row=document.getElementById("r-"+id); if(!row)return;
    var rc=row.querySelector(".rc"); if(!rc)return;
    var have={};[].forEach.call(rc.querySelectorAll(".c-allite"),function(a){have[a.getAttribute("href")]=1});
    alliteFor(id).forEach(function(l){if(have[l[1]])return;var a=document.createElement("a");a.className="c c-"+l[2];a.href=l[1];a.target="_blank";a.rel="noopener";a.textContent=l[0];rc.appendChild(a)});
  });
}
QZP.then(applyAllite);
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
    // SPM community band (students' group + teachers' WhatsApp), right under the ad slot
    var cm=c.community||{},cb=document.getElementById("cmx");
    if(!cb&&spx){cb=document.createElement("div");cb.id="cmx";spx.parentNode.insertBefore(cb,spx.nextSibling)}
    if(cb){
      var yr=cm.year||"",T=function(x){return esc(String(x||"").replace(/\{tahun\}/g,yr))};
      var tw=cm.tchWa?"https://wa.me/"+cm.tchWa+"?text="+encodeURIComponent(String(cm.tchMsg||"").replace(/\{tahun\}/g,yr)):"";
      var parts=[];
      if(cm.stuLink)parts.push('<div class="cmx-i"><span>🎓 '+T(cm.stuText||"Calon SPM {tahun}: sertai kumpulan — dapat notis sebaik kertas percubaan keluar")+'</span><a class="cmx-b cmx-s" href="'+esc(cm.stuLink)+'" target="_blank" rel="noopener" data-cm="pelajar">'+T(cm.stuBtn||"Sertai kumpulan")+' →</a></div>');
      if(tw)parts.push('<div class="cmx-i"><span>👩‍🏫 '+T(cm.tchText||"Guru: kongsi kertas percubaan SPM — sertai kumpulan guru")+'</span><span class="cmx-bs"><a class="cmx-b cmx-k" href="'+(window.BASE||"")+'/kongsi/" data-cm="borang">📤 Kongsi kertas</a><a class="cmx-b cmx-t" href="'+esc(tw)+'" target="_blank" rel="noopener" data-cm="guru">💬 WhatsApp</a></span></div>');
      cb.innerHTML=cm.on&&parts.length?'<div class="cmx">'+parts.join("")+'</div>':"";
    }
    var big=document.querySelector("[data-cm-big]");
    if(big&&cm.on&&parts.length){big.innerHTML='<div class="cmx cmx-big">'+parts.join("")+'</div>';if(cb)cb.innerHTML=""}
  }
  var cached=null;try{cached=JSON.parse(localStorage.getItem(K)||"null")}catch(e){}
  if(cached)draw(cached);
  fetch(B+"/site-config.json",{cache:"no-cache"}).then(function(r){return r.ok?r.json():null}).then(function(c){
    if(!c)return;var j=JSON.stringify(c);if(!cached||j!==JSON.stringify(cached))draw(c);try{localStorage.setItem(K,j)}catch(e){}
  }).catch(function(){});
  document.addEventListener("click",function(e){
    var q=e.target.closest&&e.target.closest("[data-sup]");
    if(q){e.preventDefault();var im=document.querySelector(".sup-qr img");if(!im)return;ga("sokong_qr",{});
      var d=document.createElement("div");d.className="sup-modal";d.innerHTML='<div class="sup-m-in"><img src="'+im.src+'" alt="'+esc(im.alt)+'"><p class="sup-m-t"><b>Jom bersama kekalkan sumber belajar percuma yang bersih &amp; kemas.</b><br>Let\u2019s keep this free learning resource clean &amp; tidy — together.</p><button type="button">Tutup</button></div>';
      d.addEventListener("click",function(ev){if(ev.target===d||ev.target.tagName==="BUTTON")d.remove()});document.body.appendChild(d);return}
    var s=e.target.closest&&e.target.closest("[data-spx]");if(s)ga("klik_iklan",{penaja:s.getAttribute("data-spx")});if(e.target.closest&&e.target.closest("[data-wa]"))ga("whatsapp_iklan",{});var g=e.target.closest&&e.target.closest("[data-cm]");if(g)ga("sertai_komuniti",{jenis:g.getAttribute("data-cm")});
  });
  document.addEventListener("keydown",function(e){if(e.key==="Escape"){var m=document.querySelector(".sup-modal");if(m)m.remove()}});
})();

// ---- owner's own papers (added in /admin → "Kertas sendiri"); shown at once, baked into the page at the next build
(function(){
  var pg=document.body.getAttribute("data-pg")||"",slug=pg.indexOf("s:")===0?pg.slice(2):"";
  if(!slug)return;
  var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  var kind=function(t){t=(t||"").toLowerCase();return /^(jawapan|skema|answer|marking)/.test(t)?"ans":/^(kertas|paper|soalan)/.test(t)?"paper":"doc"};
  var TN={percubaan:"Soalan Percubaan",sebenar:"Soalan Sebenar SPM",amali:"Amali"};
  fetch((window.BASE||"")+"/custom-rows.json",{cache:"no-cache"}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(list){if(!Array.isArray(list))return;
    var added=0,live={};
    (list||[]).forEach(function(c){if(c.on!==false)live[c.id]=1});
    // own papers baked in at the last build but since deleted / switched off in admin: hide them now
    [].forEach.call(document.querySelectorAll('.row[data-own]'),function(r){if(!live[r.id.slice(2)]){var y=r.closest("details.yr");r.remove();if(y&&!y.querySelector(".row"))y.remove()}});
    (list||[]).forEach(function(c){
      if(c.on===false||c.s!==slug||document.getElementById("r-"+c.id))return;
      var sec=document.getElementById(c.t);if(!sec)return;
      var chips=(c.links||[]).map(function(l){return '<a class="c c-'+kind(l.t)+'" href="'+esc(l.u)+'" target="_blank" rel="noopener nofollow">'+esc(l.t)+'</a>'}).join("");
      var html='<div class="row" data-own="1" id="r-'+esc(c.id)+'" data-y="'+(c.y||"")+'" data-s="'+esc(c.st||"")+'"><div class="rl">'+esc(c.label||c.st||"Kertas")+'</div><div class="rc">'+chips+'</div></div>';
      var box=null;
      if(c.y){
        box=sec.querySelector('details.yr[data-year="'+c.y+'"] .rows');
        if(!box){
          var d=document.createElement("details");d.className="yr";d.setAttribute("data-year",c.y);d.open=true;
          d.innerHTML='<summary><span>'+(TN[c.t]||"")+' SPM '+c.y+'</span><em>baharu</em></summary><div class="rows"></div>';
          var first=sec.querySelector("details.yr");
          var newer=[].slice.call(sec.querySelectorAll("details.yr")).filter(function(x){return +x.getAttribute("data-year")>c.y});
          var after=newer.length?newer[newer.length-1]:null;
          if(after)after.parentNode.insertBefore(d,after.nextSibling);else if(first)first.parentNode.insertBefore(d,first);else sec.appendChild(d);
          box=d.querySelector(".rows");
        }
      }
      if(!box)box=sec.querySelector(".rows")||sec;
      box.insertAdjacentHTML("afterbegin",html);added++;
    });
    if(added)QZP.then(applyAllite);
  }).catch(function(){});
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
// ---- 🖨 print service: cart in localStorage, page counts from /cetak.json, order saved by the worker then sent on WhatsApp
(function(){
  var B=window.BASE||"",K="spm-cetak",WA="601145339989",CT=null,D={};
  var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  var ga=function(n,p){try{if(window.gtag)gtag("event",n,p)}catch(e){}};
  function ld(){try{var c=JSON.parse(localStorage.getItem(K));return Array.isArray(c)?c:[]}catch(e){return[]}}
  function sv(){try{localStorage.setItem(K,JSON.stringify(cart))}catch(e){}}
  var cart=ld();   // [{id, f:[driveId,...]}]
  var muka=function(p){return Math.ceil(p/2)},helai=function(p){return Math.ceil(p/4)};
  var rm=function(sen){return "RM"+(sen/100).toFixed(2)};
  function find(id){for(var i=0;i<cart.length;i++)if(cart[i].id===id)return i;return -1}
  function data(){if(!CT)CT=fetch(B+"/cetak.json").then(function(r){return r.ok?r.json():{}}).catch(function(){return{}}).then(function(j){D=j||{};cart=cart.filter(function(c){return D[c.id]});return D});return CT}
  function totals(){var m=0,h=0,n=0;cart.forEach(function(c){var r=D[c.id];if(!r)return;var any=0;r[2].forEach(function(f){if(c.f.indexOf(f[2])>-1){m+=muka(f[1]);h+=helai(f[1]);any=1}});n+=any});
    var ct=h*20,pos=!h||ct>=15000?0:600;return{n:n,m:m,h:h,ct:ct,pos:pos,tot:ct+pos}}
  function chip(b,id){var on=find(id)>-1;b.textContent=on?"✓ Dalam senarai cetak":"🖨 Cetak";b.classList.toggle("on",on)}
  function bar(){
    var el=document.getElementById("ctbar");if(document.getElementById("ct-app"))return;
    var t=totals();if(!t.n){if(el)el.remove();return}
    if(!el){el=document.createElement("div");el.id="ctbar";document.body.appendChild(el)}
    el.innerHTML='<div class="wrap ctbar-in"><span>🖨 <b>'+t.n+'</b> kertas · '+t.h+' helai · <b>'+rm(t.ct)+'</b></span><a class="ctbar-go" href="'+B+'/cetak/">Semak &amp; pesan →</a></div>';
  }
  function rows(){
    [].forEach.call(document.querySelectorAll('.row[id^="r-"]'),function(row){
      var id=row.id.slice(2),rc=row.querySelector(".rc");if(!D[id]||!rc||rc.querySelector(".c-print"))return;
      var b=document.createElement("button");b.type="button";b.className="c c-print";b.setAttribute("data-ct",id);chip(b,id);rc.appendChild(b);
    });
  }
  document.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest("button.c-print");if(!b)return;
    var id=b.getAttribute("data-ct"),i=find(id);
    if(i>-1)cart.splice(i,1);else{cart.push({id:id,f:D[id][2].map(function(f){return f[2]})});ga("cetak_tambah",{label:D[id][0].slice(0,100)})}
    sv();chip(b,id);bar();
  });
  // ---- /cetak/ page
  function page(app){
    if(!cart.length){app.innerHTML='<div class="ct-empty"><p><b>Senarai cetakan anda kosong.</b></p><p>Buka halaman subjek, contohnya <a href="'+B+'/spm/addmath/">Matematik Tambahan</a> atau <a href="'+B+'/spm/sejarah/">Sejarah</a>, dan tekan <b>🖨 Cetak</b> di sebelah kertas yang anda mahu.</p></div>';return}
    var t=totals(),h="";
    cart.forEach(function(c,ci){var r=D[c.id];if(!r)return;var sm=0;
      h+='<div class="ct-item"><div class="ct-h"><b>'+(ci+1)+'. '+esc(r[0])+'</b><button type="button" class="ct-del" data-del="'+ci+'">Buang</button></div>';
      r[2].forEach(function(f){var on=c.f.indexOf(f[2])>-1;if(on)sm+=helai(f[1]);
        h+='<label class="ct-f'+(on?"":" off")+'"><input type="checkbox" data-ci="'+ci+'" data-f="'+esc(f[2])+'"'+(on?" checked":"")+'> <span class="ct-fl">'+esc(f[0])+'</span><span class="ct-fm">'+f[1]+' ms → '+helai(f[1])+' helai · '+rm(helai(f[1])*20)+'</span></label>'});
      h+='<div class="ct-sub">'+sm+' helai · <b>'+rm(sm*20)+'</b></div></div>'});
    var need=15000-t.ct;
    h+='<div class="ct-sum"><table>'+
      '<tr><td>Cetakan</td><td>'+t.h+' helai A4 × RM0.20</td><td>'+rm(t.ct)+'</td></tr>'+
      '<tr><td>Pos</td><td>'+(t.pos?'Percuma untuk cetakan RM150 ke atas':'✓ Pos percuma')+'</td><td>'+rm(t.pos)+'</td></tr>'+
      '<tr class="ct-tot"><td>Jumlah</td><td></td><td>'+rm(t.tot)+'</td></tr></table>'+
      (t.h?'<button type="button" class="ct-wa" id="ct-wa">💬 Pesan melalui WhatsApp</button>':'<p class="kerr">Tandakan sekurang-kurangnya satu kertas.</p>')+
      '<p class="muted ct-note">Mesej WhatsApp dengan senarai ini akan dibuka — tekan <b>Hantar</b>. Kami akan sahkan jumlah dan cara bayaran.</p>'+
      '<p id="ct-msg" role="status"></p><button type="button" class="ct-clear" id="ct-clear">Kosongkan senarai</button></div>';
    app.innerHTML=h;
  }
  function message(o){
    var L=["Salam, saya nak cetak kertas SPMTrial."];if(o.no)L.push("No. pesanan: #"+o.no);L.push("");
    o.items.forEach(function(it,i){var m=0;it.files.forEach(function(f){m+=f.h});
      L.push((i+1)+". "+it.name);L.push("   "+it.files.map(function(f){return f.t+" "+f.p+" ms ("+f.h+" helai)"}).join(" · "));L.push("   = "+m+" helai → "+rm(m*20))});
    L.push("","Format: A4, 4 halaman PDF sehelai (2 kiri-kanan, depan & belakang), setiap kertas berasingan");
    L.push("Cetakan: "+o.helai+" helai × RM0.20 = "+rm(o.cetak));
    L.push("Pos: "+(o.pos?rm(o.pos)+" (percuma untuk cetakan RM150 ke atas)":"PERCUMA"));
    L.push("JUMLAH: "+rm(o.jumlah),"","Nama:","Alamat:","No. telefon:");
    var s=L.join("\n");
    if(s.length>1800&&o.no){   // very long lists: one line per paper, full list is saved under the order number
      L=["Salam, saya nak cetak kertas SPMTrial.","No. pesanan: #"+o.no,""];
      o.items.forEach(function(it,i){var m=0;it.files.forEach(function(f){m+=f.h});L.push((i+1)+". "+it.name+" ("+m+" helai)")});
      L.push("","Cetakan: "+o.helai+" helai = "+rm(o.cetak)+" · Pos: "+(o.pos?rm(o.pos):"PERCUMA")+" · JUMLAH: "+rm(o.jumlah),"","Nama:","Alamat:","No. telefon:");s=L.join("\n");
    }
    return s;
  }
  function local(){var items=[],m=0,h=0;cart.forEach(function(c){var r=D[c.id];if(!r)return;
      var fs=r[2].filter(function(f){return c.f.indexOf(f[2])>-1}).map(function(f){m+=muka(f[1]);h+=helai(f[1]);return{t:f[0],p:f[1],m:muka(f[1]),h:helai(f[1]),d:f[2]}});
      if(fs.length)items.push({id:c.id,name:r[0],files:fs})});
    var ct=h*20,pos=ct>=15000?0:600;return{items:items,muka:m,helai:h,cetak:ct,pos:pos,jumlah:ct+pos}}
  function order(btn,msg){
    btn.disabled=true;msg.className="";msg.textContent="Menyediakan pesanan…";
    fetch(B+"/api/cetak",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({items:cart})})
      .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||r.status);return j})})
      .catch(function(){return local()})   // still let the student order if the server is unreachable
      .then(function(o){ga("cetak_pesan",{value:o.jumlah/100,currency:"MYR"});
        msg.className="kok";msg.innerHTML="✓ "+(o.no?"No. pesanan <b>#"+esc(o.no)+"</b>. ":"")+"Membuka WhatsApp… Jika tidak terbuka, <a id=\"ct-open\" href=\"#\">tekan di sini</a>.";
        var u="https://wa.me/"+WA+"?text="+encodeURIComponent(message(o));
        document.getElementById("ct-open").href=u;btn.disabled=false;location.href=u});
  }
  function init(){
    var app=document.getElementById("ct-app");
    data().then(function(){sv();rows();bar();if(app)page(app)});
    if(!app)return;
    app.addEventListener("change",function(e){var x=e.target;if(!x.dataset||x.dataset.ci==null)return;var c=cart[+x.dataset.ci],f=x.dataset.f,i=c.f.indexOf(f);
      if(x.checked&&i<0)c.f.push(f);if(!x.checked&&i>-1)c.f.splice(i,1);sv();page(app)});
    app.addEventListener("click",function(e){var t=e.target;
      if(t.dataset&&t.dataset.del!=null){cart.splice(+t.dataset.del,1);sv();page(app)}
      else if(t.id==="ct-clear"){if(confirm("Kosongkan senarai cetakan?")){cart=[];sv();page(app)}}
      else if(t.id==="ct-wa")order(t,document.getElementById("ct-msg"))});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
  window.addEventListener("storage",function(e){if(e.key===K){cart=ld();bar()}});
})();
