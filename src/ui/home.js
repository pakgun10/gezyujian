/** Halaman login peserta */
export function renderHome(env) {
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Masuk — ${env.APP_NAME}</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,sans-serif;background:#f1f5f9;margin:0;
    display:grid;place-items:center;min-height:100vh}
  .card{background:#fff;border-radius:16px;padding:2rem;width:min(400px,92vw);
    box-shadow:0 10px 30px rgba(0,0,0,.08)}
  h1{margin:0 0 .3rem;font-size:1.5rem;color:#0f172a}
  p.sub{margin:0 0 1.2rem;color:#64748b;font-size:.9rem}
  label{display:block;font-size:.85rem;color:#334155;margin:.7rem 0 .25rem}
  input{width:100%;padding:.65rem .8rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem}
  button{width:100%;margin-top:1.2rem;padding:.75rem;background:#f59e0b;color:#1e293b;
    border:0;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer}
  button:hover{background:#d97706}
  .err{color:#dc2626;font-size:.85rem;margin-top:.6rem;min-height:1.2em}
</style>
</head>
<body>
<div class="card">
  <h1>📝 ${env.APP_NAME}</h1>
  <p class="sub">Masukkan token dari pengawas, lalu lengkapi identitasmu.</p>
  <form id="f">
    <label>Token</label>
    <input name="token" required maxlength="10" placeholder="mis. AB12CD34" autocomplete="off">
    <label>Nama lengkap</label>
    <input name="nama" required>
    <label>Kelas</label>
    <input name="kelas" required placeholder="mis. VIII-A">
    <label>Nama sekolah</label>
    <input name="sekolah" required>
    <button type="submit">Mulai Test</button>
    <div class="err" id="err"></div>
  </form>
</div>
<script>
document.getElementById('f').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const r = await fetch('/api/login',{method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify(Object.fromEntries(fd))});
  const d = await r.json();
  if(d.ok){ location.href = '/test?attempt='+d.attempt_id; }
  else document.getElementById('err').textContent = d.pesan || 'Gagal masuk.';
});
</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
