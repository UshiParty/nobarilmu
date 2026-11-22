// Error domain dengan status HTTP, supaya semua respons error seragam:
// { "error": { "code": "...", "message": "..." } }
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, 'VALIDATION_ERROR', message, details);
const unauthorized = (message = 'Butuh login atau API key yang valid') => new HttpError(401, 'UNAUTHORIZED', message);
const forbidden = (message = 'Kamu tidak punya akses untuk aksi ini') => new HttpError(403, 'FORBIDDEN', message);
const notFound = (message = 'Data tidak ditemukan') => new HttpError(404, 'NOT_FOUND', message);
const conflict = (message) => new HttpError(409, 'CONFLICT', message);

/** Bungkus handler async supaya error otomatis diteruskan ke error handler. */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Body bukan JSON yang valid' } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan di server' } });
}

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, ah, errorHandler };
