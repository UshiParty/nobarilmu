// Bounded context: Nobar (core: Ruang Nobar)
// REST untuk membuat/gabung/oper remote/menutup ruang. Sinkron pemutaran ada di realtime.js.
const express = require('express');
const { db } = require('../../db');
const v = require('../../shared/validate');
const { requireUser, requireUserOrApiKey } = require('../../shared/auth');
const rooms = require('./room-service');
const { hub, onlineIds } = require('./realtime');
const config = require('../../config');

const router = express.Router();

function wsUrl(code) {
  const base = config.publicBaseUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
  return `${base}/ws/rooms/${code}`;
}

const withWs = (snap) => ({ ...snap, wsUrl: wsUrl(snap.code) });

router.post('/rooms', requireUser, (req, res) => {
  const videoId = v.int(req.body.videoId, 'videoId', { min: 1 });
  const classId = req.body.classId !== undefined ? v.int(req.body.classId, 'classId', { min: 1 }) : undefined;
  const visibility = v.oneOf(req.body.visibility || 'publik', 'visibility', ['publik', 'privat']);
  const room = rooms.createRoom(req.user.id, { videoId, classId, visibility });
  res.status(201).json({ data: withWs(rooms.snapshot(room)) });
});

// Ruang publik yang sedang aktif (untuk Beranda "Lagi ramai di-nobar" & tab Nobar).
router.get('/rooms', requireUserOrApiKey, (_req, res) => {
  const list = db
    .prepare("SELECT * FROM rooms WHERE status = 'aktif' AND visibility = 'publik' ORDER BY id DESC LIMIT 30")
    .all()
    .map((r) => {
      const snap = rooms.snapshot(r, onlineIds(r.code));
      return {
        code: snap.code,
        host: snap.host,
        video: snap.video,
        classId: snap.classId,
        playback: snap.playback,
        memberCount: snap.members.length,
        onlineCount: snap.members.filter((m) => m.online).length,
        createdAt: snap.createdAt,
      };
    })
    .sort((a, b) => b.onlineCount - a.onlineCount);
  res.json({ data: list });
});

router.get('/rooms/:code', requireUser, (req, res) => {
  const room = rooms.getRoom(req.params.code);
  res.json({ data: withWs(rooms.snapshot(room, onlineIds(room.code))) });
});

router.post('/rooms/:code/join', requireUser, (req, res) => {
  const room = rooms.joinRoom(req.params.code, req.user.id);
  hub.memberJoined(room.code);
  res.json({ data: withWs(rooms.snapshot(room, onlineIds(room.code))) });
});

router.post('/rooms/:code/remote', requireUser, (req, res) => {
  const toUserId = v.int(req.body.userId, 'userId', { min: 1 });
  const room = rooms.passRemote(req.params.code, req.user.id, toUserId);
  hub.remoteChanged(room.code);
  res.json({ data: withWs(rooms.snapshot(room, onlineIds(room.code))) });
});

router.post('/rooms/:code/close', requireUser, (req, res) => {
  const room = rooms.closeRoom(req.params.code, req.user.id);
  hub.closed(room.code);
  res.status(204).end();
});

module.exports = { router };
