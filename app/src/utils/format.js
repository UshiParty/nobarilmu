export function formatDuration(totalSec) {
  const sec = Number(totalSec) || 0;
  if (sec <= 0) return '0 mnt';
  if (sec < 60) return '<1 mnt';
  return `${Math.round(sec / 60)} mnt`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 4) return 'Selamat malam';
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

export function initial(name) {
  return (String(name || '').trim()[0] || '?').toUpperCase();
}
