/**
 * GezyUjian — Cloudflare Worker (API + admin)
 * Semua logika penilaian & timer di sisi server.
 */

import { renderHome } from "./ui/home.js";
import { renderTest } from "./ui/test.js";
import { renderSelesai } from "./ui/selesai.js";
import { renderAdmin } from "./ui/admin.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const nowISO = () => new Date().toISOString();
const acak = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Penilaian satu soal -> skor 0..1 */
function nilaiSoal(soal, jawaban) {
  if (soal.tipe === "bs") {
    const kunci = JSON.parse(soal.kunci)[0] === true;
    return jawaban === kunci ? 1 : 0;
  }
  if (soal.tipe === "pg") {
    const kunci = JSON.parse(soal.kunci)[0];
    return Number(jawaban) === kunci ? 1 : 0;
  }
  if (soal.tipe === "multi") {
    const kunci = new Set(JSON.parse(soal.kunci));
    const pilih = new Set((jawaban || []).map(Number));
    let benar = 0;
    let salah = 0;
    for (const k of kunci) if (pilih.has(k)) benar++;
    for (const p of pilih) if (!kunci.has(p)) salah++;
    if (soal.penilaian === "parsial") {
      const total = kunci.size;
      const skor = Math.max(0, (benar - salah) / total);
      return skor;
    }
    return benar === kunci.size && salah === 0 ? 1 : 0;
  }
  return 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ---------- API ----------
    if (path === "/api/login" && request.method === "POST") {
      const { token, nama, kelas, sekolah } = await request.json();
      const t = await env.DB.prepare(
        `SELECT t.kode, t.status, p.id AS paket_id, p.durasi_menit, p.aktif
         FROM token t JOIN paket p ON p.id = t.paket_id WHERE t.kode = ?`
      )
        .bind((token || "").trim().toUpperCase())
        .first();
      if (!t || t.status !== "aktif" || !t.aktif)
        return json({ ok: false, pesan: "Token tidak valid atau sudah terpakai." }, 403);

      // cek attempt jalan sebelumnya (lanjut test)
      const lanjut = await env.DB.prepare(
        `SELECT a.id FROM attempt a JOIN peserta s ON s.id = a.peserta_id
         WHERE s.token_kode = ? AND a.status = 'jalan'`
      )
        .bind(t.kode)
        .first();

      if (lanjut) return json({ ok: true, lanjut: true, attempt_id: lanjut.id });

      // buat attempt baru
      const soalRows = await env.DB.prepare(
        `SELECT id FROM soal WHERE paket_id = ? ORDER BY urutan`
      )
        .bind(t.paket_id)
        .all();
      let urutan = soalRows.results.map((s) => s.id);
      // acakan soal di server, dikunci untuk peserta ini
      const paket = await env.DB.prepare(`SELECT acak_soal FROM paket WHERE id = ?`)
        .bind(t.paket_id)
        .first();
      if (paket?.acak_soal) urutan = acak(urutan);

      const mulai = nowISO();
      const deadline = new Date(
        Date.now() + (t.durasi_menit || 45) * 60_000
      ).toISOString();

      const insP = await env.DB.prepare(
        `INSERT INTO peserta (token_kode, nama, kelas, sekolah, mulai_at) VALUES (?,?,?,?,?)`
      )
        .bind(t.kode, nama, kelas, sekolah, mulai)
        .run();
      const insA = await env.DB.prepare(
        `INSERT INTO attempt (peserta_id, paket_id, urutan_soal, deadline_at, status)
         VALUES (?,?,?,?, 'jalan')`
      )
        .bind(insP.meta.last_row_id, t.paket_id, JSON.stringify(urutan), deadline)
        .run();
      await env.DB.prepare(`UPDATE token SET status='terpakai', dipakai_at=? WHERE kode=?`)
        .bind(mulai, t.kode)
        .run();
      return json({ ok: true, attempt_id: insA.meta.last_row_id, deadline });
    }

    if (path === "/api/soal" && request.method === "GET") {
      const attemptId = Number(url.searchParams.get("attempt"));
      const a = await env.DB.prepare(`SELECT * FROM attempt WHERE id = ? AND status='jalan'`)
        .bind(attemptId)
        .first();
      if (!a) return json({ ok: false, pesan: "Attempt tidak ditemukan/selesai." }, 404);
      if (new Date(a.deadline_at) < new Date()) {
        await env.DB.prepare(`UPDATE attempt SET status='kedaluwarsa' WHERE id=?`).bind(a.id).run();
        return json({ ok: false, pesan: "Waktu habis." }, 410);
      }
      const ids = JSON.parse(a.urutan_soal);
      const placeholders = ids.map(() => "?").join(",");
      const soalRows = await env.DB.prepare(
        `SELECT id, tipe, teks, gambar, opsi, bobot FROM soal WHERE id IN (${placeholders})`
      )
        .bind(...ids)
        .all();
      const byId = Object.fromEntries(soalRows.results.map((s) => [s.id, s]));
      // urut sesuai acakan; opsi juga diacak (indeks jawaban disimpan relatif tampilan)
      const tampil = ids.map((id) => {
        const s = byId[id];
        let opsiTampil = null;
        if (s.opsi) {
          const arr = JSON.parse(s.opsi);
          const map = arr.map((o, i) => ({ o, i }));
          const teracak = acak(map);
          opsiTampil = { daftar: teracak.map((x) => x.o), asli: teracak.map((x) => x.i) };
        }
        return { id: s.id, tipe: s.tipe, teks: s.teks, gambar: s.gambar, opsi: opsiTampil, bobot: s.bobot };
      });
      return json({ ok: true, attempt: a.id, deadline: a.deadline_at, soal: tampil });
    }

    if (path === "/api/jawab" && request.method === "POST") {
      const { attempt, soal_id, jawaban, opsi_asli } = await request.json();
      const a = await env.DB.prepare(`SELECT * FROM attempt WHERE id=? AND status='jalan'`)
        .bind(attempt)
        .first();
      if (!a) return json({ ok: false, pesan: "Attempt tidak aktif." }, 404);
      if (new Date(a.deadline_at) < new Date()) {
        await env.DB.prepare(`UPDATE attempt SET status='kedaluwarsa' WHERE id=?`).bind(a.id).run();
        return json({ ok: false, pesan: "Waktu habis." }, 410);
      }
      // simpan jawaban relatif urutan asli (opsi_asli = pemetaan tampil->asli)
      let jaw = jawaban;
      if (Array.isArray(jawaban)) jaw = jawaban.map((j) => opsi_asli[j]);
      else if (typeof jawaban === "number" && opsi_asli) jaw = opsi_asli[jawaban];
      await env.DB.prepare(
        `INSERT INTO jawaban (attempt_id, soal_id, jawaban) VALUES (?,?,?)
         ON CONFLICT DO NOTHING`
      )
        .bind(attempt, soal_id, JSON.stringify(jaw ?? null))
        .run();
      return json({ ok: true });
    }

    if (path === "/api/submit" && request.method === "POST") {
      const { attempt } = await request.json();
      const a = await env.DB.prepare(`SELECT * FROM attempt WHERE id=?`).bind(attempt).first();
      if (!a) return json({ ok: false }, 404);
      const telat = new Date(a.deadline_at) < new Date();
      if (a.status === "jalan") {
        // penilaian
        const ids = JSON.parse(a.urutan_soal);
        const rows = await env.DB.prepare(
          `SELECT id, tipe, kunci, bobot, penilaian FROM soal WHERE paket_id = ?`
        )
          .bind(a.paket_id)
          .all();
        const soalById = Object.fromEntries(rows.results.map((s) => [s.id, s]));
        const jawRows = await env.DB.prepare(`SELECT soal_id, jawaban FROM jawaban WHERE attempt_id=?`)
          .bind(a.id)
          .all();
        const jawBySoal = Object.fromEntries(jawRows.results.map((j) => [j.soal_id, JSON.parse(j.jawaban)]));
        let totalBobot = 0;
        let skor = 0;
        for (const id of ids) {
          const s = soalById[id];
          if (!s) continue;
          totalBobot += s.bobot;
          const j = jawBySoal[id];
          if (j === undefined || j === null) continue;
          skor += nilaiSoal(s, j) * s.bobot;
        }
        const nilai = totalBobot ? Math.round((skor / totalBobot) * 10000) / 100 : 0;
        await env.DB.prepare(
          `UPDATE attempt SET status='selesai', selesai_at=?, nilai=? WHERE id=?`
        )
          .bind(nowISO(), telat ? null : nilai, a.id)
          .run();
        return json({ ok: true, nilai: telat ? null : nilai, telat });
      }
      return json({ ok: true, nilai: a.nilai, status: a.status });
    }

    if (path === "/api/status" && request.method === "GET") {
      const attemptId = Number(url.searchParams.get("attempt"));
      const a = await env.DB.prepare(`SELECT status, deadline_at, nilai FROM attempt WHERE id=?`)
        .bind(attemptId)
        .first();
      return json({ ok: true, ...a });
    }

    // ---------- Admin ----------
    if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
      return renderAdmin(request, env, path);
    }

    // ---------- Halaman ----------
    if (path === "/" ) return renderHome(env);
    if (path === "/test") return renderTest();
    if (path === "/selesai") return renderSelesai();

    return new Response("Tidak ditemukan", { status: 404 });
  },
};
