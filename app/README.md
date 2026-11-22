# NobarIlmu App

Aplikasi mobile NobarIlmu (React Native + Expo SDK 58) untuk II3140 PWAM. Memanggil microservice NobarIlmu
(`../backend`, lihat [`../backend/README.md`](../backend/README.md)).

## Layar

| Layar | Fungsi | API yang dipanggil |
|---|---|---|
| Masuk | Form email + sandi, validasi, loading, pesan error server | `POST /auth/login` |
| Daftar | Form nama, email, sandi, ulangi sandi | `POST /auth/register` |
| Pilih Minat | Pilih minimal 1 (atau Lewati); juga dipakai "Ubah minat" | `GET /interests`, `PUT /users/me/interests` |
| Beranda (tab) | Sapaan, cari kelas mini, rekomendasi, ruang nobar aktif | `GET /classes/recommended`, `GET /classes?q=`, `GET /rooms` |
| Detail Kelas | Sampul, ringkasan, daftar video + progres | `GET /classes/{id}` |
| Nobar, Sumbang (tab) | Kerangka; fitur menyusul | – |
| Profil (tab) | Angka ringkas, lanjut nonton, video yang disumbang, ubah minat, keluar | `GET /users/me/stats`, `/users/me/history`, `/videos/submissions/mine` |

Setiap layar yang memanggil API punya tiga tampilan: **loading**, **error** (dengan tombol *Coba lagi*), dan **data kosong**.
Kalau server mati, aplikasi menampilkan pesan, tidak crash.

## Struktur

```
App.js                      font + provider + navigator
src/config.js               alamat API (dari EXPO_PUBLIC_API_URL)
src/services/ApiService.js  satu-satunya pintu ke API: header Bearer, timeout, ApiError
src/context/AuthContext.js  status login; token di SecureStore (Keychain iPhone)
src/navigation/             alur: Masuk -> Pilih Minat -> Tab (+ Detail Kelas)
src/screens/                layar-layar
src/components/             Button, TextField, StateView, ClassCard, ...
src/utils/validation.js     aturan validasi form
```

## Menjalankan di iPhone

1. Pasang **Expo Go** dari App Store (perbarui ke versi terbaru; proyek ini memakai Expo SDK 58).
2. Di folder `app/`:
   ```bash
   npm install
   cp .env.example .env     # lalu isi EXPO_PUBLIC_API_URL (lihat di bawah)
   npx expo start
   ```
3. Scan QR code yang muncul dengan **Kamera** iPhone, lalu pilih *Open in Expo Go*.
   Laptop dan iPhone harus satu WiFi. Kalau diminta izin "jaringan lokal", pilih **Izinkan**.

### Alamat API (`.env`)

| Situasi | `EXPO_PUBLIC_API_URL` |
|---|---|
| Final, setelah Cloudflare Tunnel aktif | `https://nobarilmu.stei.site/api` |
| Pengembangan, iPhone satu WiFi dengan STB | `http://192.168.1.32:8080/api` |
| Pengembangan lewat Tailscale | `http://stb-kelompokfarizriko.tail048c4c.ts.net:8080/api` |

Setelah mengubah `.env`, jalankan ulang dengan `npx expo start -c`.

## Akun uji

`riko@nobarilmu.test`, `fariz@nobarilmu.test` (belum memilih minat, cocok untuk mencoba Pilih Minat), dan
`kurator@nobarilmu.test`. Sandinya `SEED_PASSWORD` di `.env` backend. Atau buat akun baru lewat layar Daftar.
