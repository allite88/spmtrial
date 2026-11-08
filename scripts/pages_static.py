# Static content pages (guide, about, contact, privacy). Imported by build.py via exec.
Y0 = trial_years[0]
_states_txt = ", ".join(st for st, _, _ in STATE_PAGES[Y0][:12]) or "Johor, Selangor, Kedah, MRSM, SBP"

def _art(path, title, desc, h1, html_body, crumbs, faqs=None, kw=""):
    lds = [{"@context": "https://schema.org", "@type": "Article", "headline": h1, "description": desc, "inLanguage": "ms-MY",
            "datePublished": "2026-11-08", "dateModified": TODAY, "author": {"@type": "Organization", "name": SITE_NAME, "url": SITE_URL + "/"},
            "publisher": {"@type": "Organization", "name": SITE_NAME, "url": SITE_URL + "/"}, "mainEntityOfPage": SITE_URL + path}]
    body = f'<article class="prose"><h1>{E(h1)}</h1>{html_body}</article>'
    if faqs:
        lds.append(faq_ld(faqs))
        body += '<section class="sec faq"><h2>Soalan Lazim</h2>' + "".join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in faqs) + "</section>"
    page(path, title, desc, body, crumbs=crumbs, lds=lds, keywords=kw)

# ---- Panduan Trial SPM (original guide content)
guide = f"""
<p class="lead">Soalan percubaan (trial) SPM ialah latihan paling hampir dengan peperiksaan sebenar. Panduan ini menerangkan apa itu trial SPM, siapa yang mengeluarkannya, dan cara menggunakannya dengan berkesan supaya markah anda naik sebelum SPM.</p>
{ad("top")}
<h2>Apa itu soalan percubaan (trial) SPM?</h2>
<p>Peperiksaan percubaan SPM ialah peperiksaan latihan untuk calon Tingkatan 5 yang mengikut format, tempoh masa dan aras kesukaran SPM sebenar. Kertasnya disediakan oleh pihak seperti <strong>Jabatan Pendidikan Negeri</strong> (contohnya {E(_states_txt)}), <strong>MRSM</strong>, <strong>Sekolah Berasrama Penuh (SBP)</strong>, Yayasan Islam Kelantan (YIK) dan sekolah-sekolah tertentu. Setiap kertas biasanya disertakan <strong>skema jawapan</strong> (skema pemarkahan).</p>

<h2>Kenapa perlu buat soalan trial dari banyak negeri?</h2>
<ul>
<li><strong>Lebih banyak variasi soalan.</strong> Setiap negeri menulis soalan berbeza, jadi anda terdedah kepada lebih banyak gaya dan konteks soalan.</li>
<li><strong>Kenal pasti topik yang kerap keluar.</strong> Topik yang muncul dalam banyak kertas negeri biasanya topik penting.</li>
<li><strong>Belajar cara skema memberi markah.</strong> Skema jawapan menunjukkan kata kunci dan langkah kerja yang diberi markah.</li>
</ul>

<h2>Cara guna soalan trial SPM dengan berkesan (6 langkah)</h2>
<ol>
<li><strong>Pilih subjek dan tahun terkini dahulu.</strong> Mulakan dengan <a href="/soalan-percubaan-spm-{Y0}/">Trial SPM {Y0}</a> kerana formatnya paling hampir dengan SPM akan datang.</li>
<li><strong>Jawab dalam masa sebenar.</strong> Gunakan tempoh masa yang sama seperti SPM, tanpa melihat nota.</li>
<li><strong>Semak dengan skema jawapan.</strong> Buka butang <em>Jawapan / Skema</em> (hijau) dan tanda sendiri dengan jujur.</li>
<li><strong>Catat kesilapan ikut topik.</strong> Senaraikan topik atau bab yang paling banyak hilang markah.</li>
<li><strong>Ulang kaji topik lemah.</strong> Gunakan nota ringkas dan latihan ikut bab di halaman subjek, contohnya <a href="/spm/sejarah/#nota">Nota Sejarah</a> atau <a href="/spm/addmath/#latihan">Latihan Matematik Tambahan</a>.</li>
<li><strong>Cuba kertas negeri lain.</strong> Selepas itu jawab kertas dari negeri lain untuk subjek yang sama dan bandingkan markah anda.</li>
</ol>
{ad("incontent")}
<h2>Cara mencari kertas di {E(SITE_NAME)}</h2>
<ul>
<li><strong>Ikut tahun:</strong> {" · ".join(f'<a href="/soalan-percubaan-spm-{y}/">Trial SPM {y}</a>' for y in trial_years[:5])}</li>
<li><strong>Ikut negeri:</strong> {" · ".join(f'<a href="/soalan-percubaan-spm-{Y0}/{sl}/">{E(st)}</a>' for st, sl, _ in STATE_PAGES[Y0][:10])}</li>
<li><strong>Ikut subjek:</strong> {" · ".join(f'<a href="/spm/{s_[0]}/">{E(s_[1])}</a>' for s_ in subjects_live[:12])}</li>
<li><strong>Carian:</strong> taip contohnya <a href="/cari/?q=kimia+{Y0}+johor">kimia {Y0} johor</a> di kotak carian.</li>
</ul>
<p>Warna butang: <span class="c c-paper">Kertas</span> soalan, <span class="c c-ans">Jawapan</span> skema, <span class="c c-quiz">Kuiz online</span> dan <span class="c c-doc">Bahan</span> lain.</p>

<h2>Selepas trial: soalan sebenar SPM</h2>
<p>Selepas menguasai kertas trial, cuba <a href="/soalan-sebenar-spm/">soalan sebenar SPM tahun-tahun lepas</a>. Kertas sebenar menunjukkan aras sebenar Lembaga Peperiksaan dan sesuai untuk latihan terakhir.</p>
{ad("bottom")}
"""
_art("/panduan-trial-spm/", f"Panduan Trial SPM {Y0}: Cara Guna Soalan Percubaan SPM Dengan Berkesan | {SITE_NAME}",
     f"Apa itu soalan percubaan (trial) SPM, siapa yang mengeluarkannya dan 6 langkah menggunakannya untuk naikkan markah SPM {Y0}. Termasuk pautan trial ikut negeri dan subjek.",
     f"Panduan Trial SPM {Y0}: Cara Guna Soalan Percubaan SPM", guide, [("Utama", "/"), ("Panduan Trial SPM", "/panduan-trial-spm/")],
     faqs=[("Apakah maksud trial SPM?", "Trial SPM ialah peperiksaan percubaan sebelum SPM yang mengikut format SPM sebenar, biasanya disediakan oleh jabatan pendidikan negeri, MRSM, SBP atau sekolah."),
           ("Adakah soalan trial SPM lebih susah daripada SPM sebenar?", "Ia berbeza mengikut negeri dan institusi. Ada kertas trial yang lebih sukar, jadi latihan dari pelbagai negeri membantu anda bersedia untuk pelbagai aras soalan."),
           ("Berapa banyak kertas trial yang perlu dibuat?", "Tiada nombor tetap, tetapi menjawab sekurang-kurangnya 3–5 set kertas lengkap bagi setiap subjek utama dalam masa sebenar, dan menyemaknya dengan skema, sangat membantu.")],
     kw=f"trial spm, apa itu trial spm, cara jawab soalan percubaan spm, tips trial spm {Y0}")

# ---- Tentang
_art("/tentang/", f"Tentang Kami | {SITE_NAME}", f"Tentang {SITE_NAME}: direktori percuma pautan soalan percubaan (trial) SPM, soalan sebenar, nota dan buku teks.",
     f"Tentang {SITE_NAME}", f"""
<p>{E(SITE_NAME)} ialah direktori percuma yang menyusun pautan bahan ulang kaji SPM — soalan percubaan (trial) SPM beserta skema jawapan, soalan sebenar SPM, nota ringkas, latihan dan buku teks KSSM Tingkatan 4 dan 5 — supaya pelajar boleh mencarinya dengan cepat <strong>ikut subjek, tahun dan negeri</strong>.</p>
<h2>Bagaimana kami berfungsi</h2>
<p>Kami <strong>tidak menyimpan atau memuat naik</strong> sebarang fail. Setiap butang membuka fail yang telah dikongsi secara awam oleh pemilik asalnya (kebanyakannya di Google Drive). Kami mengumpul pautan daripada sumber awam, menyusunnya, dan mengemas kini laman ini setiap minggu.</p>
<h2>Hak cipta &amp; permintaan pemadaman</h2>
<p>Hak cipta setiap bahan milik penulis, sekolah atau jabatan pendidikan berkenaan. Jika anda pemilik bahan dan mahu pautan dibuang atau dibetulkan, sila <a href="/hubungi/">hubungi kami</a> dengan pautan berkenaan dan kami akan mengambil tindakan secepat mungkin.</p>
<h2>Iklan</h2>
<p>Laman ini dibiayai oleh iklan supaya kekal percuma untuk pelajar. Lihat <a href="/privasi/">Dasar Privasi</a> untuk maklumat tentang kuki dan iklan.</p>""",
     [("Utama", "/"), ("Tentang Kami", "/tentang/")])

# ---- Hubungi
_art("/hubungi/", f"Hubungi Kami | {SITE_NAME}", f"Hubungi {SITE_NAME} untuk cadangan, laporan pautan rosak atau permintaan pemadaman bahan.",
     "Hubungi Kami", f"""
<p>Ada cadangan, pautan yang rosak, atau anda pemilik bahan yang mahu pautan dibuang? E-mel kami:</p>
<p class="big"><a href="mailto:{E(CONTACT)}">{E(CONTACT)}</a></p>
<p>Sila sertakan alamat halaman (URL) dan butiran pautan berkenaan. Kami biasanya membalas dalam 3 hari bekerja.</p>""",
     [("Utama", "/"), ("Hubungi", "/hubungi/")])

# ---- Privasi (required by AdSense)
_art("/privasi/", f"Dasar Privasi | {SITE_NAME}", f"Dasar privasi {SITE_NAME}: kuki, iklan Google AdSense dan data yang dikumpul.",
     "Dasar Privasi", f"""
<p>Dikemas kini: {TODAY}. Dasar ini menerangkan maklumat yang dikumpul apabila anda menggunakan {E(SITE_URL)}.</p>
<h2>Maklumat yang kami kumpul</h2>
<p>Kami tidak meminta pendaftaran dan tidak mengumpul maklumat peribadi seperti nama atau e-mel melainkan anda menghubungi kami secara sukarela. Pelayan hos mungkin merekod data teknikal asas (alamat IP, jenis pelayar, halaman dilawati) untuk keselamatan dan statistik.</p>
<h2>Kuki dan iklan</h2>
<ul>
<li>Pembekal pihak ketiga, termasuk Google, menggunakan kuki untuk memaparkan iklan berdasarkan lawatan terdahulu pengguna ke laman web ini atau laman web lain.</li>
<li>Penggunaan kuki pengiklanan oleh Google membolehkan Google dan rakan kongsinya memaparkan iklan kepada pengguna berdasarkan lawatan mereka ke laman ini dan/atau laman lain di Internet.</li>
<li>Pengguna boleh menarik diri daripada pengiklanan diperibadikan dengan melawat <a href="https://www.google.com/settings/ads" rel="noopener">Tetapan Iklan Google</a>, atau menarik diri daripada kuki pembekal pihak ketiga di <a href="https://www.aboutads.info/choices/" rel="noopener">www.aboutads.info</a>.</li>
<li>Maklumat lanjut: <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">Cara Google menggunakan data apabila anda menggunakan laman rakan kongsi</a>.</li>
</ul>
<h2>Pautan ke laman lain</h2>
<p>Laman ini mengandungi pautan ke fail dan laman pihak ketiga (contohnya Google Drive). Kami tidak bertanggungjawab terhadap kandungan atau amalan privasi laman tersebut.</p>
<h2>Kanak-kanak</h2>
<p>Laman ini ditujukan untuk pelajar sekolah menengah. Kami tidak sengaja mengumpul maklumat peribadi daripada sesiapa pun.</p>
<h2>Hubungi</h2>
<p>Soalan tentang dasar ini: <a href="mailto:{E(CONTACT)}">{E(CONTACT)}</a>.</p>""",
     [("Utama", "/"), ("Dasar Privasi", "/privasi/")])
