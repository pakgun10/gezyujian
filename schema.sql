-- Skema D1 GezyUjian
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS paket (
  id TEXT PRIMARY KEY,             -- mis. 'matematika-viii-2026a'
  judul TEXT NOT NULL,
  durasi_menit INTEGER NOT NULL DEFAULT 45,
  acak_soal INTEGER NOT NULL DEFAULT 1,
  acak_opsi INTEGER NOT NULL DEFAULT 1,
  aktif INTEGER NOT NULL DEFAULT 0,
  sumber TEXT,                     -- 'github' | 'admin'
  diubah_at TEXT
);

CREATE TABLE IF NOT EXISTS soal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paket_id TEXT NOT NULL REFERENCES paket(id) ON DELETE CASCADE,
  urutan INTEGER NOT NULL DEFAULT 0,
  tipe TEXT NOT NULL CHECK (tipe IN ('pg','bs','multi')),
  teks TEXT NOT NULL,
  gambar TEXT,                     -- URL publik (boleh null)
  opsi TEXT,                       -- JSON array (null utk bs)
  kunci TEXT NOT NULL,             -- JSON: pg->[idx], bs->[true|false], multi->[idx,...]
  bobot REAL NOT NULL DEFAULT 1,
  penilaian TEXT DEFAULT 'exact'   -- 'exact' | 'parsial' (multi)
);

CREATE TABLE IF NOT EXISTS token (
  kode TEXT PRIMARY KEY,           -- 5-10 alnum
  paket_id TEXT NOT NULL REFERENCES paket(id),
  mode TEXT NOT NULL DEFAULT 'per-orang' CHECK (mode IN ('per-orang','bersama')),
  kuota INTEGER,                   -- utk mode bersama: max peserta (null = tanpa batas)
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','terpakai','nonaktif')),
  dibuat_at TEXT NOT NULL,
  dipakai_at TEXT                  -- utk per-orang: waktu dipakai pertama
);

CREATE TABLE IF NOT EXISTS peserta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_kode TEXT NOT NULL REFERENCES token(kode),
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL,
  sekolah TEXT NOT NULL,
  mulai_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  peserta_id INTEGER NOT NULL REFERENCES peserta(id),
  paket_id TEXT NOT NULL REFERENCES paket(id),
  urutan_soal TEXT NOT NULL,       -- JSON array id soal sesuai acakan peserta ini
  deadline_at TEXT NOT NULL,       -- waktu server
  selesai_at TEXT,                 -- null = masih mengerjakan
  nilai REAL,                      -- diisi saat submit/timeout
  status TEXT NOT NULL DEFAULT 'jalan' CHECK (status IN ('jalan','selesai','kedaluwarsa'))
);

CREATE TABLE IF NOT EXISTS jawaban (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES attempt(id) ON DELETE CASCADE,
  soal_id INTEGER NOT NULL REFERENCES soal(id),
  jawaban TEXT NOT NULL,           -- JSON (indeks opsi terpilih / true/false)
  benar REAL                       -- 0..1 (parsial utk multi)
);

CREATE INDEX IF NOT EXISTS idx_soal_paket ON soal(paket_id);
CREATE INDEX IF NOT EXISTS idx_attempt_peserta ON attempt(peserta_id);
CREATE INDEX IF NOT EXISTS idx_jawaban_attempt ON jawaban(attempt_id);
