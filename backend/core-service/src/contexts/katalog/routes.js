// Bounded context: Katalog (core: Kurasi Kelas Mini, supporting: Sumbangan Video)
// Hulu bagi konteks lain: Catatan Detik, Nobar, dan Belajar hanya menyimpan videoId.
const express = require('express');
const { db } = require('../../db');
const v = require('../../shared/validate');
const { ah, badRequest, notFound, conflict, forbidden } = require('../../shared/errors');
const { requireUser, requireUserOrApiKey, requireRole } = require('../../shared/auth');
const { fetchVideoMeta, thumbnailUrl } = require('./youtube');

const router = express.Router();

// ---------- helper ----------

const CLASS_SUMMARY_SQL = `
  SELECT c.*,
         COUNT(v.id)                  AS video_count,
         COALESCE(SUM(v.duration_sec), 0) AS total_duration_sec,
         (SELECT youtube_id FROM videos
            WHERE class_id = c.id AND status = 'disetujui'
            ORDER BY position LIMIT 1) AS cover_youtube_id
  FROM classes c
  LEFT JOIN videos v ON v.class_id = c.id AND v.status = 'disetujui'
  WHERE c.status = 'terbit'`;

function toClassSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    tags: JSON.parse(row.tags || '[]'),
    videoCount: row.video_count,
    totalDurationSec: row.total_duration_sec,
    thumbnailUrl: row.cover_youtube_id ? thumbnailUrl(row.cover_youtube_id) : null,
  };
}

function toVideo(row) {
  return {
    id: row.id,
    youtubeId: row.youtube_id,
    title: row.title,
    durationSec: row.duration_sec,
    classId: row.class_id,
    position: row.position,
    status: row.status,
    thumbnailUrl: thumbnailUrl(row.youtube_id),
  };
}

function findClass(idOrSlug) {
  const byId = /^\d+$/.test(idOrSlug);
  return db
    .prepare(`SELECT * FROM classes WHERE ${byId ? 'id' : 'slug'} = ? AND status = 'terbit'`)
    .get(byId ? Number(idOrSlug) : idOrSlug);
}

// ---------- kelas mini ----------

router.get('/classes', requireUserOrApiKey, (req, res) => {
  const where = [];
  const params = [];
  if (req.query.q) {
    const q = `%${String(req.query.q).trim().toLowerCase()}%`;
    where.push('(LOWER(c.title) LIKE ? OR LOWER(c.tags) LIKE ? OR LOWER(c.description) LIKE ?)');
    params.push(q, q, q);
  }
  if (req.query.category) {
    where.push('c.category = ?');
    params.push(String(req.query.category));
  }
  const sql = `${CLASS_SUMMARY_SQL} ${where.length ? 'AND ' + where.join(' AND ') : ''}
               GROUP BY c.id ORDER BY c.id`;
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows.map(toClassSummary) });
});

// Rekomendasi (supporting: Rekomendasi Minat) dari minat + riwayat tontonan.
router.get('/classes/recommended', requireUser, (req, res) => {
  const me = db.prepare('SELECT interests FROM users WHERE id = ?').get(req.user.id);
  const interests = JSON.parse(me.interests || '[]');
  const rows = db.prepare(`${CLASS_SUMMARY_SQL} GROUP BY c.id`).all();

  const stats = db.prepare(`
    SELECT v.class_id AS class_id,
           COUNT(p.video_id) AS started,
           SUM(p.completed)  AS completed
    FROM progress p JOIN videos v ON v.id = p.video_id
    WHERE p.user_id = ? AND v.status = 'disetujui'
    GROUP BY v.class_id`).all(req.user.id);
  const byClass = Object.fromEntries(stats.map((s) => [s.class_id, s]));

  const scored = rows
    .filter((r) => r.video_count > 0)
    .map((r) => {
      const s = byClass[r.id];
      let score = 0;
      let reason = 'Kelas populer';
      if (interests.includes(r.category)) {
        score += 2;
        reason = `Sesuai minatmu: ${r.category}`;
      }
      if (s && s.completed < r.video_count) {
        score += 3;
        reason = 'Lanjutkan kelas yang sedang kamu tonton';
      }
      if (s && s.completed >= r.video_count) {
        score -= 5;
        reason = 'Sudah selesai kamu tonton';
      }
      return { ...toClassSummary(r), score, reason };
    })
    .sort((a, b) => b.score - a.score || a.id - b.id);

  res.json({ data: scored });
});

router.get('/classes/:idOrSlug', requireUserOrApiKey, (req, res) => {
  const cls = findClass(req.params.idOrSlug);
  if (!cls) throw notFound('Kelas mini tidak ditemukan');

  const videos = db
    .prepare("SELECT * FROM videos WHERE class_id = ? AND status = 'disetujui' ORDER BY position")
    .all(cls.id)
    .map(toVideo);

  let nextVideoId = videos[0] ? videos[0].id : null;
  if (req.user && videos.length) {
    const prog = db
      .prepare(
        `SELECT video_id, last_second, completed FROM progress
         WHERE user_id = ? AND video_id IN (${videos.map(() => '?').join(',')})`
      )
      .all(req.user.id, ...videos.map((x) => x.id));
    const byVideo = Object.fromEntries(prog.map((p) => [p.video_id, p]));
    for (const vid of videos) {
      const p = byVideo[vid.id];
      vid.progress = p
        ? {
            lastSecond: p.last_second,
            completed: !!p.completed,
            percent: Math.min(100, Math.round((p.last_second / Math.max(vid.durationSec, 1)) * 100)),
          }
        : { lastSecond: 0, completed: false, percent: 0 };
    }
    const next = videos.find((x) => !x.progress.completed);
    nextVideoId = next ? next.id : videos[0].id;
  }

  res.json({
    data: {
      id: cls.id,
      slug: cls.slug,
      title: cls.title,
      description: cls.description,
      category: cls.category,
      tags: JSON.parse(cls.tags || '[]'),
      wikiTitle: cls.wiki_title,
      videoCount: videos.length,
      totalDurationSec: videos.reduce((t, x) => t + x.durationSec, 0),
      thumbnailUrl: videos[0] ? videos[0].thumbnailUrl : null,
      nextVideoId,
      videos,
    },
  });
});

// ---------- video & sumbangan ----------

// Didefinisikan sebelum /videos/:id supaya tidak tertangkap sebagai :id.
router.get('/videos/submissions/mine', requireUser, (req, res) => {
  const rows = db
    .prepare(
      `SELECT v.*, c.title AS class_title FROM videos v
       LEFT JOIN classes c ON c.id = v.class_id
       WHERE v.submitted_by = ? ORDER BY v.id DESC`
    )
    .all(req.user.id);
  res.json({
    data: rows.map((r) => ({ ...toVideo(r), classTitle: r.class_title, reviewNote: r.review_note })),
  });
});

router.get('/videos/pending', requireUser, requireRole('kurator'), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT v.*, c.title AS class_title, u.name AS submitter FROM videos v
       LEFT JOIN classes c ON c.id = v.class_id
       LEFT JOIN users u ON u.id = v.submitted_by
       WHERE v.status = 'menunggu' ORDER BY v.id`
    )
    .all();
  res.json({
    data: rows.map((r) => ({ ...toVideo(r), classTitle: r.class_title, submittedBy: r.submitter, reason: r.reason })),
  });
});

router.get('/videos/:id', requireUserOrApiKey, (req, res) => {
  const id = v.int(req.params.id, 'id', { min: 1 });
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
  const canSee =
    row &&
    (row.status === 'disetujui' ||
      (req.user && (req.user.role === 'kurator' || req.user.id === row.submitted_by)));
  if (!canSee) throw notFound('Video tidak ditemukan');
  res.json({ data: toVideo(row) });
});

router.post(
  '/videos',
  requireUser,
  ah(async (req, res) => {
    const youtubeId = v.youtubeId(req.body.youtubeUrl);
    const classId = v.int(req.body.classId, 'classId', { min: 1 });
    const reason = v.str(req.body.reason, 'reason', { min: 20, max: 500 });
    if (!db.prepare("SELECT 1 FROM classes WHERE id = ? AND status = 'terbit'").get(classId)) {
      throw badRequest('Kelas mini tujuan tidak ditemukan', { field: 'classId' });
    }
    const dup = db
      .prepare("SELECT 1 FROM videos WHERE youtube_id = ? AND class_id = ? AND status != 'ditolak'")
      .get(youtubeId, classId);
    if (dup) throw conflict('Video ini sudah ada atau sedang ditinjau di kelas tersebut');

    const meta = await fetchVideoMeta(youtubeId);
    if (meta.embeddable === false) {
      throw badRequest('Video ini tidak boleh diputar di aplikasi lain (embed dimatikan)', { field: 'youtubeUrl' });
    }
    const durationSec =
      meta.durationSec ??
      (req.body.durationSec !== undefined ? v.int(req.body.durationSec, 'durationSec', { min: 1, max: 4 * 3600 }) : 0);
    const title = meta.title || (req.body.title ? v.str(req.body.title, 'title', { max: 150 }) : `Video YouTube ${youtubeId}`);

    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO videos (youtube_id, title, duration_sec, class_id, status, submitted_by, reason)
         VALUES (?, ?, ?, ?, 'menunggu', ?, ?)`
      )
      .run(youtubeId, title, durationSec, classId, req.user.id, reason);
    const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(Number(lastInsertRowid));
    res.status(201).json({ data: toVideo(row), message: 'Terima kasih! Video akan ditinjau kurator.' });
  })
);

router.patch('/videos/:id/review', requireUser, requireRole('kurator'), (req, res) => {
  const id = v.int(req.params.id, 'id', { min: 1 });
  const decision = v.oneOf(req.body.decision, 'decision', ['disetujui', 'ditolak']);
  const note = req.body.note ? v.str(req.body.note, 'note', { max: 300 }) : null;
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
  if (!row) throw notFound('Video tidak ditemukan');
  if (row.status !== 'menunggu') throw conflict(`Video sudah ${row.status}`);
  if (row.submitted_by === req.user.id) throw forbidden('Kurator tidak boleh meninjau sumbangannya sendiri');

  let duration = row.duration_sec;
  if (req.body.durationSec !== undefined) duration = v.int(req.body.durationSec, 'durationSec', { min: 1, max: 4 * 3600 });
  if (decision === 'disetujui' && duration < 1) {
    throw badRequest('Isi durationSec dulu sebelum menyetujui (durasi video belum diketahui)', { field: 'durationSec' });
  }
  const position =
    decision === 'disetujui'
      ? db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS p FROM videos WHERE class_id = ? AND status = 'disetujui'").get(row.class_id).p
      : row.position;

  db.prepare(
    'UPDATE videos SET status = ?, review_note = ?, reviewed_by = ?, duration_sec = ?, position = ? WHERE id = ?'
  ).run(decision, note, req.user.id, duration, position, id);
  res.json({ data: toVideo(db.prepare('SELECT * FROM videos WHERE id = ?').get(id)) });
});

module.exports = { router, toVideo };
