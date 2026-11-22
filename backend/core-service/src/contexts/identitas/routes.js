// Bounded context: Identitas & Akses (generic)
// Akun, login JWT, peran user/kurator, minat, dan API key untuk kelompok lain.
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../../db');
const v = require('../../shared/validate');
const { ah, badRequest, unauthorized, conflict, notFound } = require('../../shared/errors');
const { signToken, requireUser, requireRole, generateApiKey } = require('../../shared/auth');

const router = express.Router();

function toUser(row) {
  const interests = JSON.parse(row.interests || '[]');
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    interests,
    needsOnboarding: interests.length === 0,
  };
}

router.get('/interests', (_req, res) => {
  res.json({ data: v.INTERESTS });
});

router.post(
  '/auth/register',
  ah(async (req, res) => {
    const name = v.str(req.body.name, 'name', { min: 2, max: 60 });
    const email = v.email(req.body.email);
    const password = v.str(req.body.password, 'password', { min: 8, max: 72 });

    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw conflict('Email sudah terdaftar');
    }
    const hash = await bcrypt.hash(password, 10);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, hash);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(lastInsertRowid));
    res.status(201).json({ token: signToken(user), user: toUser(user) });
  })
);

router.post(
  '/auth/login',
  ah(async (req, res) => {
    const email = v.email(req.body.email);
    const password = v.str(req.body.password, 'password', { min: 1, max: 72 });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw unauthorized('Email atau kata sandi salah');
    }
    res.json({ token: signToken(user), user: toUser(user) });
  })
);

router.get('/users/me', requireUser, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ data: toUser(row) });
});

router.put('/users/me/interests', requireUser, (req, res) => {
  const list = req.body.interests;
  if (!Array.isArray(list) || list.length === 0) {
    throw badRequest('Pilih minimal 1 minat', { field: 'interests' });
  }
  const clean = [...new Set(list.map((i) => v.oneOf(i, 'interests', v.INTERESTS)))];
  db.prepare('UPDATE users SET interests = ? WHERE id = ?').run(JSON.stringify(clean), req.user.id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ data: toUser(row) });
});

// ---- API key untuk kelompok lain (hanya kurator) ----

router.post('/api-keys', requireUser, requireRole('kurator'), (req, res) => {
  const group = v.str(req.body.group, 'group', { min: 2, max: 40 });
  const { key, prefix, hash } = generateApiKey();
  const { lastInsertRowid } = db
    .prepare('INSERT INTO api_keys (group_name, key_prefix, key_hash) VALUES (?, ?, ?)')
    .run(group, prefix, hash);
  res.status(201).json({
    data: { id: Number(lastInsertRowid), group, apiKey: key },
    message: 'Simpan API key ini sekarang, key tidak akan ditampilkan lagi.',
  });
});

router.get('/api-keys', requireUser, requireRole('kurator'), (_req, res) => {
  const rows = db
    .prepare('SELECT id, group_name AS "group", key_prefix AS prefix, created_at AS createdAt, revoked_at AS revokedAt FROM api_keys ORDER BY id')
    .all();
  res.json({ data: rows });
});

router.delete('/api-keys/:id', requireUser, requireRole('kurator'), (req, res) => {
  const id = v.int(req.params.id, 'id', { min: 1 });
  const r = db.prepare("UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL").run(id);
  if (r.changes === 0) throw notFound('API key tidak ditemukan atau sudah dicabut');
  res.status(204).end();
});

module.exports = { router, toUser };
