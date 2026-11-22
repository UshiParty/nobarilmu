// Alamat API dibaca dari EXPO_PUBLIC_API_URL (file .env), supaya pindah dari
// alamat pengembangan ke URL publik cukup mengganti satu baris, tanpa mengubah kode.
const DEFAULT_API_URL = 'https://kelompokFarizRiko.stei.site/api';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
export const REQUEST_TIMEOUT_MS = 10000;
