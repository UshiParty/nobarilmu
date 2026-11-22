// Validasi form. Fungsi murni: mengembalikan pesan error (string) atau null kalau valid.
// Aturan sama dengan di server, jadi pesan error muncul di bawah kolom sebelum request dikirim.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  const v = (value || '').trim();
  if (!v) return 'Email wajib diisi.';
  if (!EMAIL_RE.test(v)) return 'Format email tidak valid.';
  return null;
}

export function validatePassword(value) {
  if (!value) return 'Kata sandi wajib diisi.';
  if (value.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (value.length > 72) return 'Kata sandi maksimal 72 karakter.';
  return null;
}

export function validateName(value) {
  const v = (value || '').trim();
  if (!v) return 'Nama wajib diisi.';
  if (v.length < 2) return 'Nama minimal 2 karakter.';
  if (v.length > 60) return 'Nama maksimal 60 karakter.';
  return null;
}

export function validateConfirm(password, confirm) {
  if (!confirm) return 'Ulangi kata sandi.';
  if (password !== confirm) return 'Kata sandi tidak sama.';
  return null;
}
