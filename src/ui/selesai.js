/** Halaman selesai — tampilkan nilai (bila sudah ada) */
export function renderSelesai() {
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Selesai</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f1f5f9;margin:0;display:grid;place-items:center;min-height:100vh}
  .card{background:#fff;border-radius:16px;padding:2.2rem;text-align:center;width:min(420px,92vw);box-shadow:0 10px 30px rgba(0,0,0,.08)}
  .nilai{font-size:3rem;font-weight:800;color:#16a34a;margin:.4rem 0}
  p{color:#475569}
</style>
</head>
<body>
<div class="card">
  <h1>🎉 Test Selesai</h1>
  <div class="nilai" id="nilai">…</div>
  <p id="ket">Mengambil hasil…</p>
  <p style="font-size:.85rem;color:#94a3b8">Simpan halaman ini atau screenshot sebagai bukti.</p>
</div>
<script>
const attempt = new URLSearchParams(location.search).get('attempt');
async function muat(){
  const r = await fetch('/api/status?attempt='+attempt);
  const d = await r.json();
  const el = document.getElementById('nilai'), ket = document.getElementById('ket');
  if(d.nilai!=null){ el.textContent = d.nilai; ket.textContent='Nilai kamu (skala 0–100).'; }
  else if(d.status==='kedaluwarsa'){ el.textContent='⏰'; ket.textContent='Waktu habis — jawaban terakhir yang tersimpan dikumpulkan.'; }
  else { el.textContent='✓'; ket.textContent='Jawaban sudah dikumpulkan.'; }
}
muat();
</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
