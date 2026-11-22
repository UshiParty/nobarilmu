// Bounded context: Belajar (supporting: Progres Tontonan)
// Aturan domain: video dianggap selesai bila ditonton minimal 90% durasinya.
// Status selesai tidak dicabut lagi walaupun pengguna memutar ulang dari awal.
const express = require('express');
const { db } = require('../../db');
const v = require('../../shared/validate');
const { notFound } = require('../../shared/errors');
const { requireUser } = require('../../shared/auth');
const { thumbnailUrl } = require('../katalog/youtube');

const router = express.Router();
const COMPLETE_RATIO = 0.9;

router.put('/progress/:videoId', requireUser, (req, res) => {
  const videoId = v.int(req.params.videoId, 'videoId', { min: 1 });
  const video = db.prepare("SELECT id, duration_sec FROM videos WHERE id = ? AND status = 'disetujui'").get(videoId);
  if (!video) throw notFound('Video tidak ditemukan');
  const lastSecond = Math.min(v.int(req.body.lastSecond, 'lastSecond', { min: 0 }), video.duration_sec);
  const reached = lastSecond >= COMPLETE_RATIO * video.duration_sec ? 1 : 0;

  db.prepare(
    `INSERT INTO progress (user_id, video_id, last_second, completed, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT (user_id, video_id) DO UPDATE SET
       last_second = excluded.last_second,
       completed   = MAX(progress.completed, excluded.completed),
       updated_at  = excluded.updated_at`
  ).run(req.user.id, videoId, lastSecond, reached);

  const p = db.prepare('SELECT * FROM progress WHERE user_id = ? AND video_id = ?').get(req.user.id, videoId);
  res.json({
    data: {
      videoId,
      lastSecond: p.last_second,
      completed: !!p.completed,
      percent: Math.min(100, Math.round((p.last_second / Math.max(video.duration_sec, 1)) * 100)),
    },
  });
});

router.get('/users/me/history', requireUser, (req, res) => {
  const limit = req.query.limit ? v.int(req.query.limit, 'limit', { min: 1, max: 50 }) : 20;
  const rows = db
    .prepare(
      `SELECT p.*, vd.title, vd.youtube_id, vd.duration_sec, vd.class_id, c.title AS class_title
       FROM progress p
       JOIN videos vd ON vd.id = p.video_id
       LEFT JOIN classes c ON c.id = vd.class_id
       WHERE p.user_id = ?
       ORDER BY p.updated_at DESC LIMIT ?`
    )
    .all(req.user.id, limit);
  res.json({
    data: rows.map((r) => ({
      videoId: r.video_id,
      title: r.title,
      classId: r.class_id,
      classTitle: r.class_title,
      thumbnailUrl: thumbnailUrl(r.youtube_id),
      lastSecond: r.last_second,
      durationSec: r.duration_sec,
      completed: !!r.completed,
      percent: Math.min(100, Math.round((r.last_second / Math.max(r.duration_sec, 1)) * 100)),
      updatedAt: r.updated_at,
    })),
  });
});

// Angka ringkas di layar Profil.
router.get('/users/me/stats', requireUser, (req, res) => {
  const one = (sql) => db.prepare(sql).get(req.user.id).c;
  res.json({
    data: {
      videosCompleted: one('SELECT COUNT(*) AS c FROM progress WHERE user_id = ? AND completed = 1'),
      notesWritten: one('SELECT COUNT(*) AS c FROM notes WHERE user_id = ?'),
      nobarJoined: one('SELECT COUNT(*) AS c FROM room_members WHERE user_id = ?'),
    },
  });
});

module.exports = { router };
