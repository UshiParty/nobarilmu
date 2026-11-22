// Bounded context: Catatan Detik (core)
// Catatan komunitas yang menempel di detik tertentu, peringkat (like), dan moderasi.
// Aturan domain: detik catatan harus berada di dalam durasi video; teks 3–200 karakter.
const express = require('express');
const { db } = require('../../db');
const v = require('../../shared/validate');
const { notFound, forbidden, badRequest } = require('../../shared/errors');
const { requireUser, requireUserOrApiKey, requireRole } = require('../../shared/auth');

const router = express.Router();

function approvedVideo(id) {
  const video = db.prepare("SELECT id, duration_sec FROM videos WHERE id = ? AND status = 'disetujui'").get(id);
  if (!video) throw notFound('Video tidak ditemukan');
  return video;
}

function noteQuery(where) {
  return `
    SELECT n.id, n.video_id, n.second, n.text, n.hidden, n.created_at, n.user_id,
           u.name AS author_name,
           (SELECT COUNT(*) FROM note_likes l WHERE l.note_id = n.id) AS likes,
           EXISTS(SELECT 1 FROM note_likes l WHERE l.note_id = n.id AND l.user_id = ?) AS liked_by_me
    FROM notes n JOIN users u ON u.id = n.user_id
    WHERE ${where}`;
}

function toNote(r) {
  return {
    id: r.id,
    videoId: r.video_id,
    second: r.second,
    text: r.text,
    author: { id: r.user_id, name: r.author_name },
    likes: r.likes,
    likedByMe: !!r.liked_by_me,
    hidden: !!r.hidden,
    createdAt: r.created_at,
  };
}

router.get('/videos/:id/notes', requireUserOrApiKey, (req, res) => {
  const video = approvedVideo(v.int(req.params.id, 'id', { min: 1 }));
  const sort = req.query.sort === 'top' ? 'likes DESC, n.second ASC' : 'n.second ASC, n.id ASC';
  const showHidden = req.user && req.user.role === 'kurator' && req.query.includeHidden === 'true';
  const rows = db
    .prepare(`${noteQuery(`n.video_id = ? ${showHidden ? '' : 'AND n.hidden = 0'}`)} ORDER BY ${sort}`)
    .all(req.user ? req.user.id : 0, video.id);
  res.json({ data: rows.map(toNote) });
});

router.post('/videos/:id/notes', requireUser, (req, res) => {
  const video = approvedVideo(v.int(req.params.id, 'id', { min: 1 }));
  const second = v.int(req.body.second, 'second', { min: 0 });
  if (second > video.duration_sec) {
    throw badRequest(`Detik catatan harus di antara 0 dan ${video.duration_sec}`, { field: 'second' });
  }
  const text = v.str(req.body.text, 'text', { min: 3, max: 200 });
  const { lastInsertRowid } = db
    .prepare('INSERT INTO notes (video_id, user_id, second, text) VALUES (?, ?, ?, ?)')
    .run(video.id, req.user.id, second, text);
  const row = db.prepare(noteQuery('n.id = ?')).get(req.user.id, Number(lastInsertRowid));
  res.status(201).json({ data: toNote(row) });
});

// Toggle suka: sekali tekan suka, tekan lagi batal.
router.post('/notes/:id/like', requireUser, (req, res) => {
  const id = v.int(req.params.id, 'id', { min: 1 });
  if (!db.prepare('SELECT 1 FROM notes WHERE id = ? AND hidden = 0').get(id)) throw notFound('Catatan tidak ditemukan');
  const removed = db.prepare('DELETE FROM note_likes WHERE note_id = ? AND user_id = ?').run(id, req.user.id);
  if (removed.changes === 0) {
    db.prepare('INSERT INTO note_likes (note_id, user_id) VALUES (?, ?)').run(id, req.user.id);
  }
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM note_likes WHERE note_id = ?').get(id);
  res.json({ data: { noteId: id, liked: removed.changes === 0, likes: c } });
});

router.delete('/notes/:id', requireUser, (req, res) => {
  const id = v.int(req.params.id, 'id', { min: 1 });
  const note = db.prepare('SELECT user_id FROM notes WHERE id = ?').get(id);
  if (!note) throw notFound('Catatan tidak ditemukan');
  if (note.user_id !== req.user.id && req.user.role !== 'kurator') {
    throw forbidden('Kamu hanya boleh menghapus catatanmu sendiri');
  }
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  res.status(204).end();
});

// Moderasi: kurator menyembunyikan / menampilkan kembali catatan.
router.patch('/notes/:id/moderation', requireUser, requireRole('kurator'), (req, res) => {
  const id = v.int(req.params.id, 'id', { min: 1 });
  if (typeof req.body.hidden !== 'boolean') throw badRequest('hidden harus true atau false', { field: 'hidden' });
  const r = db.prepare('UPDATE notes SET hidden = ? WHERE id = ?').run(req.body.hidden ? 1 : 0, id);
  if (r.changes === 0) throw notFound('Catatan tidak ditemukan');
  const row = db.prepare(noteQuery('n.id = ?')).get(req.user.id, id);
  res.json({ data: toNote(row) });
});

module.exports = { router };
