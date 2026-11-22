#!/bin/sh
# Backup database NobarIlmu dari kontainer ke folder backups/ (jalankan di STB).
# Contoh cron harian jam 02.00:  0 2 * * * cd /root/nobarilmu/backend && sh backup.sh
set -e
cd "$(dirname "$0")"
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M)

# VACUUM INTO membuat salinan yang konsisten walaupun layanan sedang berjalan.
docker compose exec -T core-service node --disable-warning=ExperimentalWarning -e "
  const { DatabaseSync } = require('node:sqlite');
  const fs = require('node:fs');
  fs.rmSync('/app/data/backup.db', { force: true });
  new DatabaseSync('/app/data/nobarilmu.db').exec(\"VACUUM INTO '/app/data/backup.db'\");
"
docker compose cp core-service:/app/data/backup.db "backups/nobarilmu-$STAMP.db"

# Simpan 7 backup terakhir saja.
ls -1t backups/nobarilmu-*.db | tail -n +8 | xargs -r rm -f
echo "Backup tersimpan: backups/nobarilmu-$STAMP.db"
