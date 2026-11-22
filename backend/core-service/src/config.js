// Semua konfigurasi dibaca dari environment (.env di STB, tidak di-commit).
const config = {
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || './data/nobarilmu.db',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8080/api',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  seedPassword: process.env.SEED_PASSWORD || '',
  demoApiKey: process.env.DEMO_API_KEY || '',
};

if (!config.jwtSecret || config.jwtSecret.length < 32) {
  console.error('JWT_SECRET wajib diisi di .env (minimal 32 karakter).');
  process.exit(1);
}

module.exports = config;
