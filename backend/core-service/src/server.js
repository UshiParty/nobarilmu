const http = require('node:http');
const config = require('./config');
const { seedIfEmpty } = require('./db/seed');
const app = require('./app');
const realtime = require('./contexts/nobar/realtime');

seedIfEmpty();

const server = http.createServer(app);
realtime.attach(server);

server.listen(config.port, () => {
  console.log(`[nobarilmu] core-service jalan di port ${config.port}`);
});

// Matikan dengan rapi saat `docker compose down` / restart.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`[nobarilmu] ${sig} diterima, berhenti...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
