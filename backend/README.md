# NobarIlmu Core Service

Microservice inti **NobarIlmu**, layanan belajar dari video pendek pilihan yang bisa ditonton bersama.
Tugas Besar II3160 Teknologi Sistem Terintegrasi × II3140 Pengembangan Aplikasi Web & Mobile, kelas **K02**.

| | |
|---|---|
| **Base URL** | `https://nobarilmu.stei.site/api` |
| **Dokumentasi interaktif (Swagger)** | `https://nobarilmu.stei.site/api/docs` |
| **Kontrak OpenAPI** | `https://nobarilmu.stei.site/api/openapi.yaml` |
| **Realtime nobar** | `wss://nobarilmu.stei.site/ws/rooms/{KODE}?token={JWT}` |
| **Repositori** | `https://github.com/UshiParty/nobarilmu` (folder `backend/`) |
| **Anggota** | 18224108 Riko Satriya Giovanni · 18224028 Muhammad Fariz D. |

---

## 1. Arsitektur

```
 Aplikasi mobile (React Native)        Kelompok lain (server ke server)
   Authorization: Bearer <JWT>                X-API-Key: <key>
              │                                     │
              └──────────────┬──────────────────────┘
                             ▼  HTTPS / WSS
              Cloudflare Tunnel  (nobarilmu.stei.site)   ← tanpa membuka port di STB
                             │
  ┌──────────────────────────┼───────────────── STB kelompok (Docker) ─────┐
  │                          ▼                                              │
  │   tunnel (cloudflared) ──► gateway (Nginx 1.28)                         │
  │                             • /api/*  → REST, rate limit 10 req/s/IP    │
  │                             • /ws/*   → WebSocket nobar                 │
  │                             ▼                                           │
  │                     core-service (Node.js 22 + Express)                 │
  │                       ├─ Identitas & Akses  (JWT, peran, API key)       │
  │                       ├─ Katalog            (kelas mini, sumbangan)     │
  │                       ├─ Catatan Detik      (catatan, like, moderasi)   │
  │                       ├─ Belajar            (progres, riwayat, rekom.)  │
  │                       └─ Nobar              (ruang, remote, WebSocket)  │
  │                             ▼                                           │
  │                     SQLite (volume nobarilmu-data, tidak ada port DB)   │
  └─────────────────────────────────────────────────────────────────────────┘

  Video TIDAK lewat STB: setiap HP memutar video langsung dari pemutar YouTube resmi.
  STB hanya menyimpan data dan meneruskan perintah sinkron (play/pause/detik) berukuran kecil.
```

| Kontainer | Image | Batas memori | Batas CPU | Port |
|---|---|---|---|---|
| `core-service` | build `./core-service` (node:22-alpine) | 256 MB | 0.5 | internal 3000 |
| `gateway` | `nginx:1.28-alpine` | 64 MB | 0.25 | `127.0.0.1:8080` (tes lokal saja) |
| `tunnel` | `cloudflare/cloudflared` | 64 MB | 0.25 | – |

Semua kontainer memakai `restart: unless-stopped`, jadi hidup lagi sendiri setelah listrik padam.

### Bounded context → folder kode

Struktur kode mengikuti rancangan DDD di makalah Tugas 1.

| Bounded context | Jenis subdomain | Folder | Aturan domain yang dijaga |
|---|---|---|---|
| Katalog | Core (Kurasi Kelas Mini), Supporting (Sumbangan Video) | `src/contexts/katalog` | Video sumbangan baru tampil setelah disetujui kurator; kurator tidak boleh meninjau sumbangannya sendiri |
| Catatan Detik | Core | `src/contexts/catatan` | Detik catatan harus di dalam durasi video; teks 3–200 karakter; hanya kurator yang memoderasi |
| Nobar | Core (Ruang Nobar) | `src/contexts/nobar` | Hanya pemegang remote yang boleh mengendalikan video; remote hanya bisa dioper ke anggota; hanya host yang menutup ruang |
| Belajar | Supporting (Progres, Rekomendasi Minat) | `src/contexts/belajar`, `katalog` | Video selesai bila ditonton ≥ 90% durasi |
| Identitas & Akses | Generic | `src/contexts/identitas`, `src/shared/auth.js` | Sandi disimpan sebagai hash bcrypt; peran `user` / `kurator`; 1 API key per kelompok |

Catatan Detik, Nobar, dan Belajar hanya menyimpan `videoId` dari Katalog (pola customer–supplier, Katalog sebagai hulu).

---

## 2. Cara mendapat akses

| Siapa | Cara | Header |
|---|---|---|
| Pengguna aplikasi | Daftar (`POST /auth/register`) atau login (`POST /auth/login`) → dapat `token` | `Authorization: Bearer <token>` |
| Kelompok lain | Minta API key ke kontak di bawah (sebutkan nama kelompok). Key hanya dikirim sekali. | `X-API-Key: <key>` |

**Akun uji** (sandi dibagikan lewat kontak di bawah, tidak ditulis di repo):

| Email | Peran |
|---|---|
| `riko@nobarilmu.test` | user |
| `fariz@nobarilmu.test` | user (belum memilih minat) |
| `kurator@nobarilmu.test` | kurator |

**Kontak:** [ISI: WhatsApp / email kelompok] · Bug atau permintaan: buka GitHub Issue di repositori ini.

**Batas pemanggilan:** 10 request/detik per IP (burst 20). Lebih dari itu dibalas `429 Too Many Requests`. WebSocket maksimal 10 koneksi per IP.

**Endpoint yang terbuka untuk kelompok lain (API key):** `GET /classes`, `GET /classes/{id}`, `GET /videos/{id}`, `GET /videos/{id}/notes`, `GET /rooms`.

---

## 3. Daftar endpoint

Semua path di bawah diawali `https://nobarilmu.stei.site/api`.
Keterangan auth: **–** publik · **JWT** login · **Key** JWT atau API key · **Kurator** JWT dengan peran kurator.

### Sistem
| Method | Path | Auth | Fungsi |
|---|---|---|---|
| GET | `/health` | – | Cek layanan hidup |
| GET | `/docs` | – | Swagger UI |
| GET | `/openapi.yaml` | – | Kontrak OpenAPI 3.0 |

### Identitas & Akses
| Method | Path | Auth | Fungsi |
|---|---|---|---|
| GET | `/interests` | – | Daftar minat yang bisa dipilih |
| POST | `/auth/register` | – | Daftar akun (nama, email, sandi ≥ 8) |
| POST | `/auth/login` | – | Login, mendapat token JWT (berlaku 7 hari) |
| GET | `/users/me` | JWT | Profil pengguna (`needsOnboarding` = belum pilih minat) |
| PUT | `/users/me/interests` | JWT | Simpan minat (minimal 1) |
| POST | `/api-keys` | Kurator | Buat API key untuk kelompok lain |
| GET | `/api-keys` | Kurator | Daftar API key |
| DELETE | `/api-keys/{id}` | Kurator | Cabut API key |

### Katalog
| Method | Path | Auth | Fungsi |
|---|---|---|---|
| GET | `/classes?q=&category=` | Key | Daftar / cari kelas mini |
| GET | `/classes/recommended` | JWT | Rekomendasi dari minat + riwayat |
| GET | `/classes/{id atau slug}` | Key | Detail kelas + daftar video (+ progres bila login) |
| GET | `/videos/{id}` | Key | Detail video |
| POST | `/videos` | JWT | Sumbang video YouTube (status `menunggu`) |
| GET | `/videos/submissions/mine` | JWT | Status video yang saya sumbang |
| GET | `/videos/pending` | Kurator | Antrean sumbangan |
| PATCH | `/videos/{id}/review` | Kurator | Setujui / tolak sumbangan |

### Catatan Detik
| Method | Path | Auth | Fungsi |
|---|---|---|---|
| GET | `/videos/{id}/notes?sort=time\|top` | Key | Catatan sebuah video |
| POST | `/videos/{id}/notes` | JWT | Tulis catatan di detik tertentu |
| POST | `/notes/{id}/like` | JWT | Suka / batal suka |
| DELETE | `/notes/{id}` | JWT | Hapus catatan (pemilik / kurator) |
| PATCH | `/notes/{id}/moderation` | Kurator | Sembunyikan / tampilkan catatan |

### Belajar
| Method | Path | Auth | Fungsi |
|---|---|---|---|
| PUT | `/progress/{videoId}` | JWT | Simpan posisi terakhir (selesai bila ≥ 90%) |
| GET | `/users/me/history` | JWT | Riwayat tonton |
| GET | `/users/me/stats` | JWT | Angka ringkas profil |

### Nobar
| Method | Path | Auth | Fungsi |
|---|---|---|---|
| POST | `/rooms` | JWT | Buat ruang (pembuat = host + pemegang remote), dapat kode 6 karakter |
| GET | `/rooms` | Key | Ruang publik yang aktif |
| GET | `/rooms/{kode}` | JWT | Status ruang |
| POST | `/rooms/{kode}/join` | JWT | Gabung dengan kode |
| POST | `/rooms/{kode}/remote` | JWT | Oper remote ke anggota lain |
| POST | `/rooms/{kode}/close` | JWT | Tutup ruang (host) |
| WS | `/ws/rooms/{kode}?token=` | JWT | Sinkron pemutaran, reaksi, chat |

**Format error** (semua endpoint):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Format email tidak valid", "details": { "field": "email" } } }
```
Kode: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500).

---

## 4. Contoh request

**Login**
```bash
curl -X POST https://nobarilmu.stei.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"riko@nobarilmu.test","password":"<sandi-uji>"}'
```
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 2, "name": "Riko (Uji)", "email": "riko@nobarilmu.test",
            "role": "user", "interests": ["Budaya","Sains"], "needsOnboarding": false }
}
```

**Ambil kelas mini (kelompok lain, pakai API key)**
```bash
curl "https://nobarilmu.stei.site/api/classes?q=batik" -H "X-API-Key: <api-key>"
```
```json
{ "data": [ { "id": 1, "slug": "asal-usul-batik", "title": "Asal-usul Batik", "category": "Budaya",
              "tags": ["batik","budaya","sejarah","jawa"], "videoCount": 4, "totalDurationSec": 1500,
              "thumbnailUrl": "https://i.ytimg.com/vi/T7IlVves8D8/hqdefault.jpg" } ] }
```

**Detail kelas + progres**
```bash
curl https://nobarilmu.stei.site/api/classes/asal-usul-batik -H "Authorization: Bearer <token>"
```
```json
{ "data": { "id": 1, "title": "Asal-usul Batik", "nextVideoId": 2,
  "videos": [
    { "id": 1, "youtubeId": "T7IlVves8D8", "title": "Asal-usul Batik Indonesia", "durationSec": 420,
      "progress": { "lastSecond": 400, "completed": true, "percent": 95 } },
    { "id": 2, "youtubeId": "pWZZyJLV5qs", "title": "Sejarah dan Motif Batik Nusantara", "durationSec": 300,
      "progress": { "lastSecond": 100, "completed": false, "percent": 33 } } ] } }
```

**Tulis Catatan Detik**
```bash
curl -X POST https://nobarilmu.stei.site/api/videos/1/notes \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"second":135,"text":"Di sini dijelaskan fungsi malam sebagai perintang warna."}'
```
Detik di luar durasi video dibalas:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Detik catatan harus di antara 0 dan 420", "details": { "field": "second" } } }
```

**Simpan progres tonton**
```bash
curl -X PUT https://nobarilmu.stei.site/api/progress/1 \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"lastSecond":400}'
```
```json
{ "data": { "videoId": 1, "lastSecond": 400, "completed": true, "percent": 95 } }
```

**Sumbang video**
```bash
curl -X POST https://nobarilmu.stei.site/api/videos \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"youtubeUrl":"https://youtu.be/s94JDFvxSsQ","classId":1,"reason":"Menjelaskan sejarah batik dengan runtut dan jelas"}'
```

**Buat ruang nobar**
```bash
curl -X POST https://nobarilmu.stei.site/api/rooms \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"videoId":1,"visibility":"publik"}'
```
```json
{ "data": { "code": "K7QX2M", "status": "aktif", "host": { "id": 2, "name": "Riko (Uji)" },
            "remoteHolder": { "id": 2, "name": "Riko (Uji)" }, "playback": "paused", "positionSec": 0,
            "wsUrl": "wss://nobarilmu.stei.site/ws/rooms/K7QX2M", "members": [ ... ] } }
```

### Protokol WebSocket nobar

Sambung ke `wss://nobarilmu.stei.site/ws/rooms/K7QX2M?token=<JWT>`. Pengguna otomatis menjadi anggota ruang.

| Arah | Pesan | Keterangan |
|---|---|---|
| klien → server | `{"type":"play","positionSec":12}` | Hanya pemegang remote |
| klien → server | `{"type":"pause","positionSec":40}` | Hanya pemegang remote |
| klien → server | `{"type":"seek","positionSec":90}` | Lompat ke detik tertentu |
| klien → server | `{"type":"seekBy","deltaSec":-10}` | Tombol −10 / +10 |
| klien → server | `{"type":"changeVideo","videoId":2}` | Ganti ke video berikutnya |
| klien → server | `{"type":"passRemote","userId":3}` | Oper remote |
| klien → server | `{"type":"reaction","emoji":"👏"}` | 👍 😂 😮 👏 ❤️ 🤔 |
| klien → server | `{"type":"chat","text":"Mantap!"}` | 1–200 karakter |
| server → klien | `state` | Snapshot lengkap ruang (saat masuk / ganti video) |
| server → klien | `playback` | `{playback, positionSec, serverTime, by}`: semua HP menyesuaikan pemutar |
| server → klien | `remote` / `presence` | Pemegang remote berganti / anggota online berubah |
| server → klien | `reaction` / `chat` / `closed` / `error` | – |

Contoh: HP yang bukan pemegang remote mengirim `play` → `{"type":"error","code":"FORBIDDEN","message":"Hanya pemegang remote yang boleh mengendalikan video"}`.

---

## 5. Menjalankan

### Di laptop (pengembangan)
```bash
cd backend
cp .env.example .env          # isi JWT_SECRET (openssl rand -hex 32) dan SEED_PASSWORD
docker compose up -d --build core-service gateway
curl http://localhost:8080/api/health
```

Tanpa Docker: `cd core-service && npm install && JWT_SECRET=... SEED_PASSWORD=... npm start` (port 3000, butuh Node ≥ 22.13).

### Deploy di STB
```bash
git clone https://github.com/UshiParty/nobarilmu.git
cd nobarilmu/backend
cp .env.example .env && nano .env     # isi JWT_SECRET, SEED_PASSWORD, TUNNEL_TOKEN
docker compose up -d --build
docker compose ps                     # ketiga kontainer harus "Up"/"healthy"
docker compose logs tunnel | tail -3
curl https://nobarilmu.stei.site/api/health
```

Cloudflare Tunnel `k02-nobarilmu`: Public Hostname `nobarilmu` · domain `stei.site` · Type HTTP · URL `gateway:80`.

**Update setelah ada perubahan kode:** `git pull && docker compose up -d --build`

### Pemantauan & backup
```bash
docker stats --no-stream      # pemakaian RAM/CPU tiap kontainer
free -h
sh backup.sh                  # salinan database ke backups/ (simpan 7 terakhir)
```

### Kepatuhan aturan STB
- Hanya kontainer microservice (core, gateway, tunnel); tidak ada frontend atau model AI di STB.
- Setiap kontainer punya `mem_limit` & `cpus`, dan `restart: unless-stopped`.
- Tidak ada port database yang terbuka (SQLite di dalam volume); gateway hanya terikat ke `127.0.0.1`.
- Rahasia (`JWT_SECRET`, `TUNNEL_TOKEN`, sandi uji) hanya di `.env`, yang di-ignore oleh git.
- API dibatasi rate limit di Nginx.
- Hanya data uji; sandi disimpan sebagai hash bcrypt.

---

## 6. Integrasi (Tugas 3)

Bagian ini dilengkapi di Tugas 3. Layanan integrasi berjalan di luar STB dan memanggil API minimal 2 kelompok lain.

| Kelompok mitra | Endpoint yang dipakai | Dipakai untuk | Batas pemanggilan | Kontak |
|---|---|---|---|---|
| [ISI] | [ISI] | [ISI] | [ISI] | [ISI] |
| [ISI] | [ISI] | [ISI] | [ISI] | [ISI] |
