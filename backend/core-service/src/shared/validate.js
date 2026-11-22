const { badRequest } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INTERESTS = ['Sejarah', 'Budaya', 'Sains', 'Teknologi', 'Kesehatan', 'Lingkungan', 'Bahasa', 'Seni'];

function str(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') throw badRequest(`${field} wajib diisi`, { field });
  const v = value.trim();
  if (v.length < min) throw badRequest(`${field} minimal ${min} karakter`, { field });
  if (v.length > max) throw badRequest(`${field} maksimal ${max} karakter`, { field });
  return v;
}

function email(value) {
  const v = str(value, 'email', { max: 120 }).toLowerCase();
  if (!EMAIL_RE.test(v)) throw badRequest('Format email tidak valid', { field: 'email' });
  return v;
}

function int(value, field, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw badRequest(`${field} harus bilangan bulat`, { field });
  if (n < min || n > max) throw badRequest(`${field} harus di antara ${min} dan ${max}`, { field });
  return n;
}

function oneOf(value, field, allowed) {
  if (!allowed.includes(value)) throw badRequest(`${field} harus salah satu dari: ${allowed.join(', ')}`, { field });
  return value;
}

/** Ambil ID video YouTube (11 karakter) dari berbagai bentuk link. */
function youtubeId(url) {
  if (typeof url !== 'string') throw badRequest('Link YouTube wajib diisi', { field: 'youtubeUrl' });
  const m = url.trim().match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/
  );
  if (!m) throw badRequest('Link YouTube tidak valid', { field: 'youtubeUrl' });
  return m[1];
}

module.exports = { str, email, int, oneOf, youtubeId, INTERESTS };
