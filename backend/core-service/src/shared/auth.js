// Autentikasi & otorisasi (bonus TST):
// - Pengguna aplikasi  -> JWT di header  Authorization: Bearer <token>
// - Kelompok lain      -> API key di header  X-API-Key: <key>
// - Peran              -> 'user' atau 'kurator' (dicek dengan requireRole)
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../db');
const { unauthorized, forbidden } = require('./errors');

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/** Kembalikan user dari token, atau null kalau token tidak valid. */
function userFromToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(Number(payload.sub)) || null;
  } catch {
    return null;
  }
}

function bearer(req) {
  const h = req.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

const hashApiKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

function clientFromApiKey(key) {
  if (!key) return null;
  return (
    db
      .prepare('SELECT id, group_name FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL')
      .get(hashApiKey(key)) || null
  );
}

/** Wajib login sebagai pengguna aplikasi. */
function requireUser(req, _res, next) {
  const token = bearer(req);
  const user = token && userFromToken(token);
  if (!user) return next(unauthorized('Silakan login terlebih dahulu'));
  req.user = user;
  next();
}

/** Login pengguna ATAU API key kelompok lain (untuk endpoint baca data). */
function requireUserOrApiKey(req, _res, next) {
  const token = bearer(req);
  if (token) {
    const user = userFromToken(token);
    if (!user) return next(unauthorized('Token tidak valid atau kedaluwarsa'));
    req.user = user;
    return next();
  }
  const client = clientFromApiKey(req.get('x-api-key'));
  if (!client) return next(unauthorized('Butuh token login atau header X-API-Key yang valid'));
  req.apiClient = client;
  next();
}

/** Hanya untuk peran tertentu, dipasang setelah requireUser. */
const requireRole = (role) => (req, _res, next) => {
  if (!req.user || req.user.role !== role) return next(forbidden(`Hanya ${role} yang boleh melakukan aksi ini`));
  next();
};

function generateApiKey() {
  const key = 'nbi_' + crypto.randomBytes(24).toString('base64url');
  return { key, prefix: key.slice(0, 8), hash: hashApiKey(key) };
}

module.exports = {
  signToken,
  userFromToken,
  requireUser,
  requireUserOrApiKey,
  requireRole,
  hashApiKey,
  generateApiKey,
};
