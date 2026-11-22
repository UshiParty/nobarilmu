// Logika domain Ruang Nobar (core): sinkron pemutaran, oper remote.
// Dipakai oleh REST (routes.js) dan WebSocket (realtime.js) supaya aturannya di satu tempat.
// Aturan domain: hanya pemegang remote yang boleh mengirim perintah pemutaran;
// remote hanya bisa dioper ke anggota ruang; hanya host yang boleh menutup ruang.
const crypto = require('node:crypto');
const { db } = require('../../db');
const { notFound, forbidden, badRequest } = require('../../shared/errors');
const { toVideo } = require('../katalog/routes');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa 0/O, 1/I agar tidak tertukar
const CODE_RE = /^[A-Z0-9]{6}$/;

function newCode() {
  for (let i = 0; i < 10; i++) {
    let code = '';
    for (const b of crypto.randomBytes(6)) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (!db.prepare('SELECT 1 FROM rooms WHERE code = ?').get(code)) return code;
  }
  throw new Error('Gagal membuat kode ruang unik');
}

function normalizeCode(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!CODE_RE.test(c)) throw badRequest('Kode ruang harus 6 huruf/angka', { field: 'code' });
  return c;
}

function getRoom(code, { activeOnly = true } = {}) {
  const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(normalizeCode(code));
  if (!room || (activeOnly && room.status !== 'aktif')) throw notFound('Ruang tidak ditemukan');
  return room;
}

function approvedVideo(id) {
  const row = db.prepare("SELECT * FROM videos WHERE id = ? AND status = 'disetujui'").get(id);
  if (!row) throw badRequest('Video tidak ditemukan', { field: 'videoId' });
  return row;
}

/** Posisi pemutaran saat ini (detik), dihitung dari waktu server. */
function currentPosition(room, durationSec) {
  let pos = room.position_sec;
  if (room.playback === 'playing') pos += (Date.now() - room.state_updated_at) / 1000;
  return Math.max(0, Math.min(pos, durationSec || pos));
}

const isMember = (roomId, userId) =>
  !!db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);

function createRoom(userId, { videoId, classId, visibility }) {
  const video = approvedVideo(videoId);
  const code = newCode();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO rooms (code, host_id, remote_holder_id, video_id, class_id, visibility, state_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(code, userId, userId, video.id, classId ?? video.class_id, visibility, Date.now());
  db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(Number(lastInsertRowid), userId);
  return getRoom(code);
}

function joinRoom(code, userId) {
  const room = getRoom(code);
  db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)').run(room.id, userId);
  return room;
}

function passRemote(code, byUserId, toUserId) {
  const room = getRoom(code);
  if (byUserId !== room.remote_holder_id && byUserId !== room.host_id) {
    throw forbidden('Hanya pemegang remote atau host yang boleh mengoper remote');
  }
  if (!isMember(room.id, toUserId)) throw badRequest('Penerima remote bukan anggota ruang ini', { field: 'userId' });
  db.prepare('UPDATE rooms SET remote_holder_id = ? WHERE id = ?').run(toUserId, room.id);
  return getRoom(code);
}

function closeRoom(code, byUserId) {
  const room = getRoom(code);
  if (byUserId !== room.host_id) throw forbidden('Hanya host yang boleh menutup ruang');
  db.prepare("UPDATE rooms SET status = 'selesai', playback = 'paused' WHERE id = ?").run(room.id);
  return room;
}

/**
 * Terapkan perintah pemutaran dari pemegang remote.
 * cmd: { type: 'play'|'pause'|'seek'|'seekBy'|'changeVideo', positionSec?, deltaSec?, videoId? }
 */
function applyCommand(code, userId, cmd) {
  const room = getRoom(code);
  if (userId !== room.remote_holder_id) throw forbidden('Hanya pemegang remote yang boleh mengendalikan video');
  const video = db.prepare('SELECT duration_sec FROM videos WHERE id = ?').get(room.video_id);
  const clamp = (s) => Math.max(0, Math.min(Number(s), video.duration_sec));
  const now = Date.now();
  let pos = currentPosition(room, video.duration_sec);
  let playback = room.playback;
  let videoId = room.video_id;

  switch (cmd.type) {
    case 'play':
      if (cmd.positionSec !== undefined) pos = clamp(cmd.positionSec);
      playback = 'playing';
      break;
    case 'pause':
      if (cmd.positionSec !== undefined) pos = clamp(cmd.positionSec);
      playback = 'paused';
      break;
    case 'seek':
      if (!Number.isFinite(Number(cmd.positionSec))) throw badRequest('positionSec wajib diisi');
      pos = clamp(cmd.positionSec);
      break;
    case 'seekBy':
      if (!Number.isFinite(Number(cmd.deltaSec))) throw badRequest('deltaSec wajib diisi');
      pos = clamp(pos + Number(cmd.deltaSec));
      break;
    case 'changeVideo':
      videoId = approvedVideo(Number(cmd.videoId)).id;
      pos = 0;
      playback = 'paused';
      break;
    default:
      throw badRequest(`Perintah tidak dikenal: ${cmd.type}`);
  }
  db.prepare('UPDATE rooms SET playback = ?, position_sec = ?, state_updated_at = ?, video_id = ? WHERE id = ?').run(
    playback,
    pos,
    now,
    videoId,
    room.id
  );
  return getRoom(code);
}

/** Snapshot lengkap ruang untuk dikirim ke aplikasi. */
function snapshot(room, onlineUserIds = new Set()) {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(room.video_id);
  const nameOf = (id) => (db.prepare('SELECT name FROM users WHERE id = ?').get(id) || {}).name;
  const members = db
    .prepare(
      `SELECT u.id, u.name FROM room_members m JOIN users u ON u.id = m.user_id
       WHERE m.room_id = ? ORDER BY m.joined_at`
    )
    .all(room.id)
    .map((m) => ({ ...m, online: onlineUserIds.has(m.id) }));
  return {
    code: room.code,
    status: room.status,
    visibility: room.visibility,
    classId: room.class_id,
    host: { id: room.host_id, name: nameOf(room.host_id) },
    remoteHolder: { id: room.remote_holder_id, name: nameOf(room.remote_holder_id) },
    video: toVideo(video),
    playback: room.playback,
    positionSec: Number(currentPosition(room, video.duration_sec).toFixed(2)),
    serverTime: Date.now(),
    members,
    createdAt: room.created_at,
  };
}

module.exports = {
  normalizeCode,
  getRoom,
  createRoom,
  joinRoom,
  passRemote,
  closeRoom,
  applyCommand,
  snapshot,
  isMember,
};
