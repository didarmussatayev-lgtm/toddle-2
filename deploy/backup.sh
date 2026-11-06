#!/bin/sh
# Ежедневный сжатый дамп БД с хранением BACKUP_KEEP_DAYS дней. Первый дамп — сразу при старте.
set -eu
umask 077
while true; do
  ts=$(date +%Y-%m-%d_%H%M)
  file="/backups/journal_${ts}.dump"
  if pg_dump --format=custom --compress=9 --file="${file}.part"; then
    mv "${file}.part" "${file}"
    echo "backup ok: ${file} ($(du -h "${file}" | cut -f1))"
  else
    echo "backup FAILED at ${ts}" >&2
  fi
  # удалить дампы старше срока хранения (только файлы journal_*.dump в /backups)
  find /backups -maxdepth 1 -type f -name 'journal_*.dump*' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
  sleep 86400
done
