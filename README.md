# GezyUjian

Aplikasi test/ujian online sederhana untuk sekolah — dibangun di Cloudflare Pages + Workers + D1.

**Fitur:**
- Login peserta dengan token (dibuat admin), lalu nama, kelas, sekolah
- Tipe soal: pilihan ganda, benar-salah, multiresponse
- Soal & opsi diacak per peserta (dikunci di server sejak mulai)
- Timer berbasis waktu server — submit setelah deadline ditolak
- Soal mendukung LaTeX (KaTeX) dan gambar
- Penilaian otomatis (multiresponse mendukung nilai parsial)
- Panel admin: paket soal, token, monitor peserta, rekap nilai, ekspor CSV
- Isi soal via repo GitHub (folder `soal/`) — sinkron dari panel admin

**Alamat:** https://tes.gezytech.web.id/

## Struktur

```
src/            kode Workers (API + admin)
soal/           paket soal (JSON) — sumber dari GitHub
schema.sql      skema database D1
public/         aset statis
```

## Menulis soal

Tambah/edit file di `soal/` (format lihat `soal/contoh.json`), commit & push.
Panel admin → **Sinkron dari GitHub** untuk menerapkan perubahan ke database.

## Deploy

```bash
wrangler d1 create gezyujian
wrangler d1 execute gezyujian --file=schema.sql
wrangler deploy
```
