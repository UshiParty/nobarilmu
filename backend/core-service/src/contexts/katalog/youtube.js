// Subdomain generic "Metadata Video": ambil judul & durasi dari YouTube.
// Pakai YouTube Data API (videos.list, 1 unit kuota) kalau YOUTUBE_API_KEY diisi,
// kalau tidak pakai oEmbed (tanpa key, hanya judul). Selalu dengan timeout,
// dan kalau gagal tetap jalan (mengembalikan null), sesuai prinsip tahan gangguan.
const config = require('../../config');

const thumbnailUrl = (youtubeId) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

/** Ubah durasi ISO-8601 (PT4M13S) menjadi detik. */
function isoDurationToSeconds(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

async function fetchJson(url, timeoutMs = 4000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** @returns {Promise<{title: string|null, durationSec: number|null, embeddable: boolean|null}>} */
async function fetchVideoMeta(youtubeId) {
  try {
    if (config.youtubeApiKey) {
      const url =
        'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status' +
        `&id=${encodeURIComponent(youtubeId)}&key=${encodeURIComponent(config.youtubeApiKey)}`;
      const data = await fetchJson(url);
      const item = data.items && data.items[0];
      if (!item) return { title: null, durationSec: null, embeddable: false };
      return {
        title: item.snippet.title,
        durationSec: isoDurationToSeconds(item.contentDetails.duration),
        embeddable: item.status.embeddable,
      };
    }
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
      'https://www.youtube.com/watch?v=' + youtubeId
    )}`;
    const data = await fetchJson(url);
    return { title: data.title || null, durationSec: null, embeddable: null };
  } catch (err) {
    console.warn(`[youtube] metadata ${youtubeId} gagal diambil: ${err.message}`);
    return { title: null, durationSec: null, embeddable: null };
  }
}

module.exports = { fetchVideoMeta, thumbnailUrl };
