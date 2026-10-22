/** Halaman test — timer server, KaTeX, gambar, autosave jawaban */
export function renderTest() {
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,sans-serif;margin:0;background:#f1f5f9}
  header{position:sticky;top:0;background:#0f172a;color:#fff;padding:.8rem 1rem;
    display:flex;justify-content:space-between;align-items:center;z-index:5}
  #timer{font-variant-numeric:tabular-nums;background:#f59e0b;color:#0f172a;
    padding:.3rem .8rem;border-radius:8px;font-weight:700}
  #timer.habis{background:#dc2626;color:#fff}
  main{max-width:820px;margin:1rem auto;padding:0 1rem}
  .soal{background:#fff;border-radius:12px;padding:1.2rem;margin-bottom:1rem;
    box-shadow:0 4px 12px rgba(0,0,0,.05)}
  .badge{font-size:.72rem;background:#e2e8f0;color:#334155;padding:.15rem .5rem;border-radius:6px}
  img.gambar{max-width:100%;border-radius:8px;margin:.5rem 0}
  .opsi{display:block;margin:.45rem 0;padding:.6rem .8rem;border:1px solid #cbd5e1;
    border-radius:8px;cursor:pointer}
  .opsi:hover{border-color:#f59e0b}
  .opsi.pilih{border-color:#f59e0b;background:#fffbeb}
  .tombol{position:fixed;bottom:1rem;right:1rem}
  #submit{padding:.8rem 1.4rem;background:#16a34a;color:#fff;border:0;border-radius:10px;
    font-size:1rem;font-weight:600;cursor:pointer}
  .habis-overlay{position:fixed;inset:0;background:rgba(15,23,42,.92);color:#fff;
    display:none;place-items:center;z-index:99;text-align:center}
</style>
</head>
<body>
<header>
  <div>📝 GezyUjian</div>
  <div id="timer">--:--</div>
</header>
<main id="soal-list">Memuat soal…</main>
<div class="tombol"><button id="submit">✓ Selesai &amp; Kumpulkan</button></div>
<div class="habis-overlay" id="habis"><div><h1>⏰ Waktu Habis</h1><p>Jawaban terakhir yang tersimpan telah dikumpulkan.</p></div></div>
<script type="module">
const qs = new URLSearchParams(location.search);
const attempt = qs.get('attempt');
let data = null;
const timers = [];

function tex(el){
  if(window.renderMathInElement) renderMathInElement(el,{delimiters:[
    {left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]});
}

function opsHtml(s, i){
  if(s.tipe==='bs') return \`<label class="opsi" data-i="0">Benar</label>
    <label class="opsi" data-i="1">Salah</label>\`;
  return s.opsi.daftar.map((o,j)=>\`<label class="opsi" data-i="\${j}">\${String.fromCharCode(65+j)}. \${o}</label>\`).join('');
}

function jawabTersimpan(s){ // dari localStorage agar refresh tidak hilang sebelum ke server
  try{return JSON.parse(localStorage.getItem('gzj-'+attempt+'-'+s.id))}catch{return null}
}

function buatSoal(s, no){
  const div = document.createElement('div');
  div.className='soal';
  const tipeLabel = {pg:'Pilihan Ganda',bs:'Benar–Salah',multi:'Multiresponse (pilih semua yang benar)'}[s.tipe];
  div.innerHTML = \`<div style="display:flex;justify-content:space-between">
      <strong>Soal \${no}</strong><span class="badge">\${tipeLabel} · bobot \${s.bobot}</span></div>
    <div class="teks"></div>
    \${s.gambar?\`<img class="gambar" src="\${s.gambar}" alt="gambar soal">\`:''}
    <div class="opsi-w"></div>\`;
  div.querySelector('.teks').textContent = '';
  // teks soal (dengan LaTeX): sisip via innerHTML terkendali (teks berasal dari admin)
  const teks = div.querySelector('.teks');
  teks.innerHTML = s.teks;
  const w = div.querySelector('.opsi-w');
  w.innerHTML = opsHtml(s);
  // pasang opsi asli sebagai data
  const asli = s.tipe==='bs' ? [true,false] : (s.opsi? s.opsi.asli : null);
  w.querySelectorAll('.opsi').forEach(el=>{
    el.addEventListener('click',()=>{
      if(s.tipe==='multi'){ el.classList.toggle('pilih'); }
      else { w.querySelectorAll('.opsi').forEach(x=>x.classList.remove('pilih')); el.classList.add('pilih'); }
      simpan(s, div, asli);
    });
  });
  tex(div);
  return div;
}

function kumpulkanPilihan(div){
  return [...div.querySelectorAll('.opsi.pilih')].map(e=>Number(e.dataset.i));
}

async function simpan(s, div, asli){
  let jaw = kumpulkanPilihan(div);
  if(s.tipe==='bs') jaw = jaw.length? (jaw[0]===0? true : false) : null;
  if(s.tipe!=='multi') jaw = jaw.length? jaw[0] : null;
  localStorage.setItem('gzj-'+attempt+'-'+s.id, JSON.stringify({jaw, asli}));
  await fetch('/api/jawab',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({attempt, soal_id:s.id, jawaban:jaw, opsi_asli:asli})});
}

async function mulai(){
  const r = await fetch('/api/soal?attempt='+attempt);
  const d = await r.json();
  if(!d.ok){ document.getElementById('soal-list').textContent = d.pesan; return; }
  data = d;
  const list = document.getElementById('soal-list');
  list.innerHTML='';
  d.soal.forEach((s,i)=> list.appendChild(buatSoal(s,i+1)));
  // timer
  const el = document.getElementById('timer');
  const deadline = new Date(d.deadline).getTime();
  function tick(){
    const sisa = deadline - Date.now();
    if(sisa<=0){ waktuHabis(); return; }
    const m = Math.floor(sisa/60000), sec = Math.floor(sisa%60000/1000);
    el.textContent = \`\${String(m).padStart(2,'0')}:\${String(sec).padStart(2,'0')}\`;
    if(m<1) el.classList.add('habis');
  }
  tick(); const t = setInterval(tick,1000); timers.push(t);
}

async function waktuHabis(){
  clearInterval(timers[0]);
  document.getElementById('habis').style.display='grid';
  await fetch('/api/submit',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({attempt})});
  setTimeout(()=>location.href='/selesai?attempt='+attempt, 2500);
}

document.getElementById('submit').addEventListener('click', async ()=>{
  if(!confirm('Kumpulkan jawaban sekarang?')) return;
  clearInterval(timers[0]);
  const r = await fetch('/api/submit',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({attempt})});
  const d = await r.json();
  location.href='/selesai?attempt='+attempt;
});

mulai();
</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
