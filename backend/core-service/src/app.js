const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const YAML = require('yaml');
const swaggerUi = require('swagger-ui-express');
const { errorHandler, notFound } = require('./shared/errors');

const identitas = require('./contexts/identitas/routes');
const katalog = require('./contexts/katalog/routes');
const catatan = require('./contexts/catatan/routes');
const belajar = require('./contexts/belajar/routes');
const nobar = require('./contexts/nobar/routes');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // di belakang Nginx + Cloudflare
app.use(express.json({ limit: '20kb' }));

// CORS sederhana: API dipanggil dari aplikasi mobile & kelompok lain.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-API-Key');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const api = express.Router();

api.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nobarilmu-core', time: new Date().toISOString() });
});

// Dokumentasi OpenAPI: /api/docs (Swagger UI) dan /api/openapi.yaml
const specText = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
api.get('/openapi.yaml', (_req, res) => res.type('text/yaml').send(specText));
api.use('/docs', swaggerUi.serve, swaggerUi.setup(YAML.parse(specText), { customSiteTitle: 'NobarIlmu API' }));

api.use(identitas.router);
api.use(katalog.router);
api.use(catatan.router);
api.use(belajar.router);
api.use(nobar.router);

api.use((_req, _res, next) => next(notFound('Endpoint tidak ditemukan')));

app.use('/api', api);
app.use(errorHandler);

module.exports = app;
