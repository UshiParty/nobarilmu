// Data uji (bukan data pribadi asli). Dijalankan otomatis saat database masih kosong,
// atau manual dengan:  npm run seed
const bcrypt = require('bcryptjs');
const config = require('../config');
const { db, transaction } = require('./index');
const { hashApiKey } = require('../shared/auth');

// Durasi di bawah adalah perkiraan; perbarui bila perlu (atau lewat review kurator).
const CLASSES = [
  {
    slug: 'asal-usul-batik',
    title: 'Asal-usul Batik',
    category: 'Budaya',
    tags: ['batik', 'budaya', 'sejarah', 'jawa'],
    wiki: 'Batik',
    description:
      'Batik adalah teknik menghias kain dengan malam (lilin) lalu dicelup warna. Kelas ini membahas sejarah, makna motif, dan daerah asalnya.',
    videos: [
      ['T7IlVves8D8', 'Asal-usul Batik Indonesia', 420],
      ['pWZZyJLV5qs', 'Sejarah dan Motif Batik Nusantara', 300],
      ['GqLwyex50hU', 'Fakta Menarik Sejarah Batik', 240],
      ['ZfIKRLlT8Vw', 'Batik, Simbol Budaya dan Peradaban Bangsa', 540],
    ],
  },
  {
    slug: 'sains-di-dapur',
    title: 'Sains di Dapur',
    category: 'Sains',
    tags: ['sains', 'eksperimen', 'dapur', 'kimia'],
    wiki: 'Eksperimen',
    description: 'Konsep sains sehari-hari yang bisa dicoba dengan bahan dapur: massa jenis, reaksi asam-basa, dan perubahan wujud.',
    videos: [
      ['_p6hCA23nVw', 'Eksperimen Sains dengan Bahan Dapur', 360],
      ['d6Z7Fxm4DvI', 'Air, Minyak, dan Es Batu', 240],
      ['nfRqNWZ0k8o', 'Eksperimen dengan 6 Bahan Murah dari Dapur', 480],
    ],
  },
  {
    slug: 'siaga-banjir',
    title: 'Siaga Banjir',
    category: 'Lingkungan',
    tags: ['banjir', 'bencana', 'mitigasi', 'lingkungan'],
    wiki: 'Banjir',
    description: 'Penyebab banjir, apa yang harus disiapkan, dan apa yang dilakukan sebelum, saat, dan sesudah banjir.',
    videos: [
      ['sJsC6zQCfNI', 'Edukasi Bencana: Banjir', 240],
      ['1B0agZyoPc0', 'Sahabat Siaga: Banjir', 600],
      ['2Mm8oBujeTI', 'Siaga Perlengkapan Bencana', 180],
    ],
  },
];

const USERS = [
  { name: 'Kurator NobarIlmu', email: 'kurator@nobarilmu.test', role: 'kurator', interests: ['Budaya', 'Sains', 'Lingkungan'] },
  { name: 'Riko (Uji)', email: 'riko@nobarilmu.test', role: 'user', interests: ['Budaya', 'Sains'] },
  { name: 'Fariz (Uji)', email: 'fariz@nobarilmu.test', role: 'user', interests: [] },
];

function seed() {
  if (!config.seedPassword || config.seedPassword.length < 8) {
    console.error('SEED_PASSWORD wajib diisi di .env (minimal 8 karakter) untuk membuat akun uji.');
    process.exit(1);
  }
  const hash = bcrypt.hashSync(config.seedPassword, 10);

  transaction(() => {
    const userIds = {};
    for (const u of USERS) {
      db.prepare(
        'INSERT OR IGNORE INTO users (name, email, password_hash, role, interests) VALUES (?, ?, ?, ?, ?)'
      ).run(u.name, u.email, hash, u.role, JSON.stringify(u.interests));
      userIds[u.email] = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email).id;
    }
    const curator = userIds['kurator@nobarilmu.test'];

    for (const c of CLASSES) {
      db.prepare(
        'INSERT OR IGNORE INTO classes (slug, title, description, category, tags, wiki_title) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(c.slug, c.title, c.description, c.category, JSON.stringify(c.tags), c.wiki);
      const classId = db.prepare('SELECT id FROM classes WHERE slug = ?').get(c.slug).id;
      c.videos.forEach(([yt, title, dur], i) => {
        const exists = db.prepare('SELECT 1 FROM videos WHERE youtube_id = ? AND class_id = ?').get(yt, classId);
        if (!exists) {
          db.prepare(
            `INSERT INTO videos (youtube_id, title, duration_sec, class_id, position, status, reviewed_by)
             VALUES (?, ?, ?, ?, ?, 'disetujui', ?)`
          ).run(yt, title, dur, classId, i + 1, curator);
        }
      });
    }

    // Beberapa Catatan Detik contoh di video pertama kelas Batik.
    const firstVideo = db.prepare("SELECT id FROM videos WHERE youtube_id = 'T7IlVves8D8'").get().id;
    if (!db.prepare('SELECT 1 FROM notes WHERE video_id = ?').get(firstVideo)) {
      const ins = db.prepare('INSERT INTO notes (video_id, user_id, second, text) VALUES (?, ?, ?, ?)');
      ins.run(firstVideo, curator, 15, 'Kata "batik" berasal dari bahasa Jawa: amba (menulis) dan titik.');
      ins.run(firstVideo, userIds['riko@nobarilmu.test'], 95, 'Bagian ini menjelaskan peran malam (lilin) sebagai perintang warna.');
      ins.run(firstVideo, curator, 210, 'Batik diakui UNESCO sebagai Warisan Budaya Takbenda pada 2 Oktober 2009.');
    }

    if (config.demoApiKey) {
      db.prepare('INSERT OR IGNORE INTO api_keys (group_name, key_prefix, key_hash) VALUES (?, ?, ?)').run(
        'kelompok-uji',
        config.demoApiKey.slice(0, 8),
        hashApiKey(config.demoApiKey)
      );
    }
  });
  console.log('[seed] data uji siap: 3 kelas mini, 3 akun uji.');
}

function seedIfEmpty() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (c === 0) seed();
}

if (require.main === module) seed();

module.exports = { seed, seedIfEmpty };
