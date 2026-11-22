// Sinkronisasi Ruang Nobar lewat WebSocket.
// Yang lewat STB hanya perintah kecil (play/pause/detik), BUKAN videonya:
// setiap HP memutar video langsung dari pemutar YouTube resmi.
//
// Koneksi:  wss://<host>/ws/rooms/<KODE>?token=<JWT>
// Klien -> server: play | pause | seek | seekBy | changeVideo | passRemote | reaction | chat | ping
// Server -> klien: state | playback | remote | presence | reaction | chat | closed | error | pong
const { WebSocketServer } = require('ws');
const { userFromToken } = require('../../shared/auth');
const rooms = require('./room-service');

const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 });
/** code -> Set<ws> */
const channels = new Map();

const PATH_RE = /^\/ws\/rooms\/([A-Za-z0-9]{6})\/?$/;
const REACTIONS = ['👍', '😂', '😮', '👏', '❤️', '🤔'];

function onlineIds(code) {
  return new Set([...(channels.get(code) || [])].map((ws) => ws.user.id));
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(code, msg) {
  for (const ws of channels.get(code) || []) send(ws, msg);
}

function broadcastState(code, type = 'state') {
  try {
    const snap = rooms.snapshot(rooms.getRoom(code), onlineIds(code));
    broadcast(code, { type, room: snap });
  } catch {
    /* ruang sudah ditutup */
  }
}

/** Dipanggil dari REST saat remote dioper / ruang ditutup / ada yang bergabung. */
const hub = {
  remoteChanged: (code) => broadcastState(code, 'remote'),
  memberJoined: (code) => broadcastState(code, 'presence'),
  closed: (code) => {
    broadcast(code, { type: 'closed', message: 'Ruang ditutup oleh host' });
    for (const ws of channels.get(code) || []) ws.close(4000, 'room closed');
  },
};

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return send(ws, { type: 'error', code: 'INVALID_JSON', message: 'Pesan bukan JSON' });
  }
  const { code, user } = ws;
  try {
    switch (msg.type) {
      case 'ping':
        return send(ws, { type: 'pong', serverTime: Date.now() });
      case 'play':
      case 'pause':
      case 'seek':
      case 'seekBy':
      case 'changeVideo': {
        const room = rooms.applyCommand(code, user.id, msg);
        const snap = rooms.snapshot(room, onlineIds(code));
        return broadcast(code, {
          type: msg.type === 'changeVideo' ? 'state' : 'playback',
          by: { id: user.id, name: user.name },
          ...(msg.type === 'changeVideo'
            ? { room: snap }
            : { playback: snap.playback, positionSec: snap.positionSec, serverTime: snap.serverTime }),
        });
      }
      case 'passRemote':
        rooms.passRemote(code, user.id, Number(msg.userId));
        return broadcastState(code, 'remote');
      case 'reaction':
        if (!REACTIONS.includes(msg.emoji)) throw new Error(`Reaksi harus salah satu dari ${REACTIONS.join(' ')}`);
        return broadcast(code, { type: 'reaction', emoji: msg.emoji, by: { id: user.id, name: user.name } });
      case 'chat': {
        const text = String(msg.text || '').trim();
        if (text.length < 1 || text.length > 200) throw new Error('Chat harus 1–200 karakter');
        return broadcast(code, { type: 'chat', text, by: { id: user.id, name: user.name }, at: Date.now() });
      }
      default:
        throw new Error(`Tipe pesan tidak dikenal: ${msg.type}`);
    }
  } catch (err) {
    send(ws, { type: 'error', code: err.code || 'BAD_MESSAGE', message: err.message });
  }
}

function rejectUpgrade(socket, status, text) {
  socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

/** Pasang ke http.Server. */
function attach(server) {
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    const m = PATH_RE.exec(url.pathname);
    if (!m) return rejectUpgrade(socket, 404, 'Not Found');

    const user = userFromToken(url.searchParams.get('token') || '');
    if (!user) return rejectUpgrade(socket, 401, 'Unauthorized');

    let code;
    try {
      code = rooms.joinRoom(m[1], user.id).code; // otomatis jadi anggota
    } catch {
      return rejectUpgrade(socket, 404, 'Not Found');
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.code = code;
      ws.isAlive = true;
      if (!channels.has(code)) channels.set(code, new Set());
      channels.get(code).add(ws);

      send(ws, { type: 'state', room: rooms.snapshot(rooms.getRoom(code), onlineIds(code)) });
      broadcastState(code, 'presence');

      ws.on('pong', () => (ws.isAlive = true));
      ws.on('message', (data) => handleMessage(ws, data.toString()));
      ws.on('close', () => {
        channels.get(code)?.delete(ws);
        if (channels.get(code)?.size === 0) channels.delete(code);
        broadcastState(code, 'presence');
      });
    });
  });

  // Heartbeat: buang koneksi mati & jaga koneksi tetap hidup lewat Cloudflare.
  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);
  server.on('close', () => clearInterval(timer));
}

module.exports = { attach, hub, onlineIds };
