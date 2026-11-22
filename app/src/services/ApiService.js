// Satu-satunya pintu ke microservice NobarIlmu (https://kelompokFarizRiko.stei.site/api).
// - menambahkan header Authorization: Bearer <token> otomatis
// - timeout, supaya aplikasi tidak menggantung kalau server mati
// - semua kegagalan dijadikan ApiError dengan pesan yang siap ditampilkan (tidak crash)
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = tidak sampai ke server
    this.code = code;
    this.details = details;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => {
  authToken = token;
};
/** Dipanggil kalau server membalas 401 padahal kita sedang login (token kedaluwarsa). */
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(method, path, { body, auth = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'Server terlalu lama merespons, coba lagi.');
    }
    throw new ApiError(0, 'NETWORK', 'Server sedang tidak bisa dihubungi, coba lagi.');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // balasan bukan JSON
  }

  if (!res.ok) {
    const e = data && data.error;
    if (res.status === 401 && auth && authToken && onUnauthorized) onUnauthorized();
    const fallback =
      res.status === 429 ? 'Terlalu banyak permintaan, tunggu sebentar lalu coba lagi.' : `Terjadi kesalahan (${res.status}).`;
    throw new ApiError(res.status, (e && e.code) || `HTTP_${res.status}`, (e && e.message) || fallback, e && e.details);
  }
  return data;
}

const get = (path) => request('GET', path);

export const Api = {
  health: () => request('GET', '/health', { auth: false }),

  // Identitas & Akses
  login: (email, password) => request('POST', '/auth/login', { auth: false, body: { email, password } }),
  register: (name, email, password) => request('POST', '/auth/register', { auth: false, body: { name, email, password } }),
  me: () => get('/users/me'),
  interests: () => request('GET', '/interests', { auth: false }),
  saveInterests: (interests) => request('PUT', '/users/me/interests', { body: { interests } }),

  // Katalog
  searchClasses: (q) => get(`/classes?q=${encodeURIComponent(q)}`),
  recommendedClasses: () => get('/classes/recommended'),
  classDetail: (id) => get(`/classes/${encodeURIComponent(id)}`),
  mySubmissions: () => get('/videos/submissions/mine'),

  // Belajar
  myStats: () => get('/users/me/stats'),
  myHistory: (limit = 10) => get(`/users/me/history?limit=${limit}`),

  // Nobar
  publicRooms: () => get('/rooms'),
};
