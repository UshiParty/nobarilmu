// Database SQLite memakai modul bawaan Node (node:sqlite), jadi tidak perlu
// compile library native di STB ARM dan tidak ada port database yang terbuka.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new DatabaseSync(config.dbPath);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Identitas & Akses
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','kurator')),
  interests     TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name  TEXT NOT NULL,
  key_prefix  TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at  TEXT
);

-- Katalog
CREATE TABLE IF NOT EXISTS classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',
  wiki_title  TEXT,
  status      TEXT NOT NULL DEFAULT 'terbit' CHECK (status IN ('terbit','draf')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS videos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id    TEXT NOT NULL,
  title         TEXT NOT NULL,
  duration_sec  INTEGER NOT NULL,
  class_id      INTEGER REFERENCES classes(id),
  position      INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','disetujui','ditolak')),
  submitted_by  INTEGER REFERENCES users(id),
  reason        TEXT,
  reviewed_by   INTEGER REFERENCES users(id),
  review_note   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_class ON videos(class_id, status, position);

-- Catatan Detik
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    INTEGER NOT NULL REFERENCES videos(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  second      INTEGER NOT NULL,
  text        TEXT NOT NULL,
  hidden      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_video ON notes(video_id, second);

CREATE TABLE IF NOT EXISTS note_likes (
  note_id  INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (note_id, user_id)
);

-- Belajar
CREATE TABLE IF NOT EXISTS progress (
  user_id      INTEGER NOT NULL REFERENCES users(id),
  video_id     INTEGER NOT NULL REFERENCES videos(id),
  last_second  INTEGER NOT NULL DEFAULT 0,
  completed    INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, video_id)
);

-- Nobar
CREATE TABLE IF NOT EXISTS rooms (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,
  host_id           INTEGER NOT NULL REFERENCES users(id),
  remote_holder_id  INTEGER NOT NULL REFERENCES users(id),
  video_id          INTEGER NOT NULL REFERENCES videos(id),
  class_id          INTEGER REFERENCES classes(id),
  visibility        TEXT NOT NULL DEFAULT 'publik' CHECK (visibility IN ('publik','privat')),
  playback          TEXT NOT NULL DEFAULT 'paused' CHECK (playback IN ('playing','paused')),
  position_sec      REAL NOT NULL DEFAULT 0,
  state_updated_at  INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','selesai')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id    INTEGER NOT NULL REFERENCES rooms(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, user_id)
);
`);

/** Jalankan fungsi di dalam satu transaksi. */
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, transaction };
