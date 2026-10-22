/**
 * Panel admin GezyUjian — login token, kelola paket/token, monitor, hasil, sinkron GitHub.
 * Admin API: /api/admin/* diproteksi cookie sesi sederhana (ADMIN_TOKEN secret).
 */

const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });

const nowISO = () => new Date().toISOString();

function authOk(request, env) {
  const c = request.headers.get("Cookie") || "";
  return c.includes(`gzj_admin=${env.ADMIN_TOKEN}`);
}

const ADMIN_HTML = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin — GezyUjian</title>
<style>
 body{font-family:system-ui,sans-serif;margin:0;background:#f1f5f9}
 header{background:#0f172a;color:#fff;padding:.9rem 1.2rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
 header a{color:#cbd5e1;text-decoration:none;padding:.3rem .6rem;border-radius:6px}
 header a.aktif,header a:hover{background:#1e293b;color:#f59e0b}
 main{max-width:960px;margin:1.2rem auto;padding:0 1rem}
 table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;
   box-shadow:0 4px 12px rgba(0,0,0,.05)}
 th,td{padding:.6rem .8rem;text-align:left;border-bottom:1px solid #e2e8f0;font-size:.9rem}
 th{background:#f8fafc;color:#334155}
 .tombol{padding:.5rem 1rem;background:#f59e0b;border:0;border-radius:8px;font-weight:600;cursor:pointer}
 .tombol.hijau{background:#16a34a;color:#fff}
 .tombol.merah{background:#dc2626;color:#fff}
 input,select{padding:.5rem;border:1px solid #cbd5e1;border-radius:8px}
 .kartu{background:#fff;border-radius:12px;padding:1.2rem;margin-bottom:1rem;box-shadow:0 4px 12px rgba(0,0,0,.05)}
 .badge{font-size:.72rem;background:#e2e8f0;color:#334155;padding:.15rem .5rem;border-radius:6px;margin-left:.4rem}
 .ok{color:#16a34a}.red{color:#dc2626}
 #login{max-width:340px;margin:20vh auto}
</style>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script></head>
<body>
<div id="login" class="kartu" style="display:none">
  <h2>🔐 Login Admin</h2>
  <input id="pw" type="password" placeholder="ADMIN_TOKEN" style="width:100%">
  <button class="tombol" style="width:100%;margin-top:.8rem" onclick="login()">Masuk</button>
  <p id="lerr" class="red"></p>
</div>
<div id="app" style="display:none">
<header>
  <strong>GezyUjian</strong>
  <a href="#" data-tab="paket" class="aktif">Paket & Soal</a>
  <a href="#" data-tab="token">Token</a>
  <a href="#" data-tab="monitor">Monitor</a>
  <a href="#" data-tab="hasil">Hasil</a>
  <a href="#" data-tab="sinkron">Sinkron GitHub</a>
</header>
<main id="isi"></main>
</div>
<script type="module">
const $ = s=>document.querySelector(s);
let TAB='paket';

async function cek(){
  const r = await fetch('/api/admin/cek');
  if(r.ok){ $('#app').style.display='block'; $('#login').style.display='none'; buka('paket'); }
  else { $('#login').style.display='block'; }
}
async function login(){
  const r = await fetch('/api/admin/login',{method:'POST',
    headers:{'content-type':'application/json'},body:JSON.stringify({pw:$('#pw').value})});
  if(r.ok){ cek(); } else $('#lerr').textContent='Token salah.';
}
window.login=login;

document.querySelectorAll('header a').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault(); buka(a.dataset.tab);
}));

function buka(tab){ TAB=tab;
  document.querySelectorAll('header a').forEach(a=>a.classList.toggle('aktif',a.dataset.tab===tab));
  ({paket,token,monitor,hasil,sinkron}[tab])();
}

/* ---- PAKET ---- */
async function paket(){
  const r = await fetch('/api/admin/paket'); const d = await r.json();
  $('#isi').innerHTML = \`<div class="kartu"><h3>Paket Soal (\${d.length})</h3>
   <table><tr><th>ID</th><th>Judul</th><th>Durasi</th><th>Jumlah soal</th><th>Aktif</th><th></th></tr>
   \${d.map(p=>\`<tr id="prow-\${p.id}"><td>\${p.id}</td><td>\${p.judul}</td><td>\${p.durasi_menit} m</td>
     <td>\${p.jml}</td><td id="paktif-\${p.id}">\${p.aktif?'<span class=ok>✓ aktif</span>':'—'}</td>
     <td><button class="tombol" onclick="pratinjau('\${p.id}')">Lihat soal</button>
         <button class="tombol \${p.aktif?'merah':'hijau'}" onclick="toggleAktif('\${p.id}',\${p.aktif?1:0})">\${p.aktif?'Nonaktifkan':'Aktifkan'}</button></td></tr>\`).join('')}</table></div>
   <div id="pratinjau"></div>\`;
}
window.pratinjau = async (pid)=>{
  const r = await fetch('/api/admin/soal?paket='+pid); const d = await r.json();
  const el = document.getElementById('pratinjau');
  el.innerHTML = \`<div class="kartu"><h3>Pratinjau: \${pid} (\${d.length} soal)</h3>\${d.map((s,i)=>
    \`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:.8rem;margin:.6rem 0">
      <b>Soal \${i+1}</b> <span class="badge">\${s.tipe} · bobot \${s.bobot} · \${s.penilaian}</span>
      <div class="teks" id="t\${i}"></div>
      \${s.gambar?\`<img src="\${s.gambar}" style="max-width:60%;border-radius:6px;display:block;margin:.4rem 0">\`:''}
      <div class="opsiw" id="o\${i}"></div>
      <div style="font-size:.85rem;color:#16a34a;margin-top:.4rem">Kunci: \${s.kunci_tampil}</div>
    </div>\`).join('')}</div>\`;
  d.forEach((s,i)=>{
    document.getElementById('t'+i).innerHTML = s.teks;
    document.getElementById('o'+i).innerHTML = s.opsi ? s.opsi.map((o,j)=>\`<div>\${String.fromCharCode(65+j)}. \${o}</div>\`).join('') : (s.tipe==='bs'?'Benar / Salah':'');
  });
  if(window.renderMathInElement) renderMathInElement(el,{delimiters:[
    {left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]});
};
window.toggleAktif = async (pid, aktif)=>{
  await fetch('/api/admin/aktifkan',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({paket:pid, aktif: !aktif})});
  paket();
};

/* ---- TOKEN ---- */
async function token(){
  const r = await fetch('/api/admin/token'); const d = await r.json();
  const paketOpts = d.paket.map(p=>\`<option value="\${p.id}">\${p.judul}</option>\`).join('');
  $('#isi').innerHTML = \`
  <div class="kartu"><h3>Generate Token</h3>
   Paket <select id="tp">\${paketOpts}</select>
   Jumlah <input id="jn" type="number" value="10" min="1" max="200" style="width:70px">
   Mode <select id="tm" onchange="document.getElementById('kq').style.display=this.value==='bersama'?'inline':'none'">
     <option value="per-orang">per orang (1x pakai)</option>
     <option value="bersama">bersama (banyak peserta)</option></select>
   <span id="kq" style="display:none">Kuota <input id="tk" type="number" value="32" min="1" style="width:60px" placeholder="kosong=tanpa batas"></span>
   <button class="tombol" onclick="genTok()">Generate</button>
   <span id="gmsg" class="ok"></span></div>
  <div class="kartu"><h3>Daftar Token (\${d.token.length})</h3>
   <table><tr><th>Kode</th><th>Paket</th><th>Mode</th><th>Kuota</th><th>Status</th><th>Dipakai</th></tr>
   \${d.token.map(t=>\`<tr><td><b>\${t.kode}</b></td><td>\${t.paket_id}</td>
     <td>\${t.mode||'per-orang'}</td><td>\${t.kuota??'—'}</td>
     <td>\${t.status==='aktif'?'<span class=ok>aktif</span>':(t.status==='terpakai'?'<span class=red>terpakai</span>':'nonaktif')}</td>
     <td>\${t.dipakai_at||'—'}</td></tr>\`).join('')}</table></div>\`;
}
window.genTok = async ()=>{
  const r = await fetch('/api/admin/token',{method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({paket:$('#tp').value, jumlah:Number($('#jn').value),
      mode:$('#tm').value, kuota:Number($('#tk')?.value)||null})});
  const d = await r.json();
  $('#gmsg').textContent = d.ok? \`\${d.dibuat} token dibuat\` : 'gagal';
  token();
};

/* ---- MONITOR ---- */
async function monitor(){
  const r = await fetch('/api/admin/monitor'); const d = await r.json();
  $('#isi').innerHTML = \`<div class="kartu"><h3>Peserta</h3>
   <table><tr><th>Nama</th><th>Kelas</th><th>Paket</th><th>Mulai</th><th>Status</th><th>Sisa waktu</th></tr>
   \${d.map(a=>{
     const sisa = a.status==='jalan'? Math.max(0,Math.round((new Date(a.deadline_at)-Date.now())/60000))+' m':'—';
     const st = {jalan:'<span class=ok>⏳ mengerjakan</span>',selesai:'✅ selesai',kedaluwarsa:'<span class=red>⏰ habis</span>'}[a.status];
     return \`<tr><td>\${a.nama}</td><td>\${a.kelas}</td><td>\${a.paket_id}</td>
       <td>\${a.mulai_at?.slice(0,19).replace('T',' ')}</td><td>\${st}</td><td>\${sisa}</td></tr>\`;
   }).join('')||'<tr><td colspan=6>belum ada</td></tr>'}</table></div>\`;
}

/* ---- HASIL ---- */
async function hasil(){
  const r = await fetch('/api/admin/hasil'); const d = await r.json();
  $('#isi').innerHTML = \`<div class="kartu"><h3>Rekap Nilai</h3>
   <button class="tombol hijau" onclick="location.href='/api/admin/hasil.csv'">⬇ Ekspor CSV</button>
   <table><tr><th>Nama</th><th>Kelas</th><th>Sekolah</th><th>Paket</th><th>Nilai</th><th>Status</th></tr>
   \${d.map(a=>\`<tr><td>\${a.nama}</td><td>\${a.kelas}</td><td>\${a.sekolah}</td><td>\${a.paket_id}</td>
     <td><b>\${a.nilai??'—'}</b></td><td>\${a.status}</td></tr>\`).join('')||'<tr><td colspan=6>belum ada</td></tr>'}</table></div>\`;
}

/* ---- SINKRON ---- */
async function sinkron(){
  $('#isi').innerHTML = \`<div class="kartu"><h3>Sinkron Soal dari GitHub</h3>
   <p>Repo <b>\${'pakgun10/gezyujian'}</b>, folder <b>soal/</b>. Semua file JSON akan dibaca,
   paket lama dengan ID sama akan diperbarui.</p>
   <button class="tombol" onclick="doSinkron()">🔄 Sinkron Sekarang</button>
   <pre id="sout" style="background:#0f172a;color:#a5f3a5;padding:1rem;border-radius:8px;
     margin-top:1rem;white-space:pre-wrap;display:none"></pre></div>\`;
}
window.doSinkron = async ()=>{
  const out = $('#sout'); out.style.display='block'; out.textContent='Menyinkronkan…';
  const r = await fetch('/api/admin/sinkron',{method:'POST'});
  const d = await r.json();
  out.textContent = d.log || JSON.stringify(d,null,2);
};

cek();
</script></body></html>`;

export async function renderAdmin(request, env, path) {
  const url = new URL(request.url);

  // login
  if (path === "/api/admin/login" && request.method === "POST") {
    const { pw } = await request.json();
    if (pw && pw === env.ADMIN_TOKEN)
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json",
          "Set-Cookie": `gzj_admin=${env.ADMIN_TOKEN}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
        },
      });
    return json({ ok: false }, 401);
  }
  if (path === "/api/admin/cek") return authOk(request, env) ? json({ ok: true }) : json({ ok: false }, 401);
  if (!authOk(request, env) && path.startsWith("/api/admin")) return json({ ok: false }, 401);
  if (!authOk(request, env) && path === "/admin") {
    return new Response(ADMIN_HTML.replace('id="login" class="kartu" style="display:none"', 'id="login" class="kartu"'), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // ---- paket
  if (path === "/api/admin/paket") {
    const d = await env.DB.prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM soal s WHERE s.paket_id=p.id) AS jml FROM paket p ORDER BY p.id`
    ).all();
    return json(d.results);
  }

  // ---- pratinjau soal satu paket
  if (path === "/api/admin/soal") {
    const pid = url.searchParams.get("paket");
    const d = await env.DB.prepare(
      `SELECT tipe, teks, gambar, opsi, kunci, bobot, penilaian FROM soal WHERE paket_id=? ORDER BY urutan`
    ).bind(pid).all();
    const tampil = d.results.map((s) => {
      let kunciTampil = "-";
      try {
        const k = JSON.parse(s.kunci);
        if (s.tipe === "bs") kunciTampil = k[0] === true ? "Benar" : "Salah";
        else if (s.opsi) {
          const opsiArr = JSON.parse(s.opsi);
          kunciTampil = k.map((idx) => String.fromCharCode(65 + Number(idx))).join(", ");
        } else kunciTampil = JSON.stringify(k);
      } catch {}
      return { ...s, opsi: s.opsi ? JSON.parse(s.opsi) : null, kunci_tampil: kunciTampil };
    });
    return json(tampil);
  }

  // ---- aktifkan / nonaktifkan paket
  if (path === "/api/admin/aktifkan" && request.method === "POST") {
    const { paket, aktif } = await request.json();
    await env.DB.prepare(`UPDATE paket SET aktif=? WHERE id=?`)
      .bind(aktif ? 1 : 0, paket)
      .run();
    return json({ ok: true });
  }

  // ---- token
  if (path === "/api/admin/token" && request.method === "GET") {
    const tokens = await env.DB.prepare(`SELECT * FROM token ORDER BY dibuat_at DESC LIMIT 500`).all();
    const paket = await env.DB.prepare(`SELECT id, judul FROM paket`).all();
    return json({ token: tokens.results, paket: paket.results });
  }
  if (path === "/api/admin/token" && request.method === "POST") {
    const { paket, jumlah, mode, kuota } = await request.json();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let dibuat = 0;
    for (let i = 0; i < Math.min(jumlah || 1, 200); i++) {
      let kode = "";
      do {
        kode = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        const ada = await env.DB.prepare(`SELECT 1 FROM token WHERE kode=?`).bind(kode).first();
        if (!ada) break;
      } while (true);
      await env.DB.prepare(
        `INSERT INTO token (kode, paket_id, mode, kuota, dibuat_at) VALUES (?,?,?,?,?)`
      )
        .bind(kode, paket, mode === "bersama" ? "bersama" : "per-orang",
              mode === "bersama" && kuota ? Number(kuota) : null, nowISO())
        .run();
      dibuat++;
    }
    return json({ ok: true, dibuat });
  }

  // ---- monitor & hasil
  if (path === "/api/admin/monitor" || path === "/api/admin/hasil") {
    const d = await env.DB.prepare(
      `SELECT s.nama, s.kelas, s.sekolah, a.paket_id, a.mulai_at, a.deadline_at, a.status, a.nilai
       FROM attempt a JOIN peserta s ON s.id = a.peserta_id ORDER BY a.mulai_at DESC LIMIT 500`
    ).all();
    if (path.endsWith(".csv") || url.pathname === "/api/admin/hasil.csv") {
      const csv = ["nama,kelas,sekolah,paket,nilai,status"]
        .concat(d.results.map((r) => [r.nama, r.kelas, r.sekolah, r.paket_id, r.nilai ?? "", r.status].join(",")))
        .join("\n");
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="nilai-gezyujian.csv"`,
        },
      });
    }
    return json(d.results);
  }

  // ---- sinkron dari GitHub
  if (path === "/api/admin/sinkron" && request.method === "POST") {
    const log = [];
    const headers = { "User-Agent": "gezyujian", Accept: "application/vnd.github+json" };
    if (env.GITHUB_READ_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_READ_TOKEN}`;
    const gh = await fetch(
      `https://api.github.com/repos/${env.SINKRON_REPO}/contents/${env.SINKRON_FOLDER}`,
      { headers }
    );
    if (!gh.ok) return json({ ok: false, log: `Gagal membaca GitHub: ${gh.status}` }, 502);
    const files = (await gh.json()).filter((f) => f.name.endsWith(".json"));
    for (const f of files) {
      try {
        const raw = await (await fetch(f.download_url, { headers })).json();
        const pid = raw.paket;
        if (!pid || !Array.isArray(raw.soal)) {
          log.push(`⚠ ${f.name}: format tidak dikenal, dilewati`);
          continue;
        }
        await env.DB.prepare(`DELETE FROM soal WHERE paket_id=?`).bind(pid).run();
        await env.DB.prepare(
          `INSERT INTO paket (id, judul, durasi_menit, acak_soal, acak_opsi, aktif, sumber, diubah_at)
           VALUES (?,?,?,?,?,COALESCE((SELECT aktif FROM paket WHERE id=?),0),'github',?)
           ON CONFLICT(id) DO UPDATE SET judul=excluded.judul, durasi_menit=excluded.durasi_menit,
           acak_soal=excluded.acak_soal, acak_opsi=excluded.acak_opsi, diubah_at=excluded.diubah_at`
        )
          .bind(pid, raw.judul || pid, raw.durasi_menit || 45, raw.acak_soal ? 1 : 0, raw.acak_opsi ? 1 : 0, pid, nowISO())
          .run();
        let i = 0;
        for (const s of raw.soal) {
          const kunci = Array.isArray(s.kunci) ? s.kunci : [s.kunci];
          await env.DB.prepare(
            `INSERT INTO soal (paket_id, urutan, tipe, teks, gambar, opsi, kunci, bobot, penilaian)
             VALUES (?,?,?,?,?,?,?,?,?)`
          )
            .bind(
              pid, i++, s.tipe, s.teks, s.gambar || null,
              s.opsi ? JSON.stringify(s.opsi) : null,
              JSON.stringify(kunci), s.bobot || 1, s.penilaian || "exact"
            )
            .run();
        }
        log.push(`✓ ${f.name}: paket "${pid}" — ${raw.soal.length} soal`);
      } catch (e) {
        log.push(`✗ ${f.name}: ${e.message}`);
      }
    }
    return json({ ok: true, log: log.join("\n") || "tidak ada file JSON" });
  }

  return new Response(ADMIN_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
}
