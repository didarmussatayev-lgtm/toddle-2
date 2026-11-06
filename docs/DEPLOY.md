# Развёртывание на сервере школы (Казахстан)

Стек: приложение (Next.js) + PostgreSQL 16 + Caddy (HTTPS от Let's Encrypt) + ежедневные бэкапы. Всё в Docker, запускается одной командой.
Данные хранятся только на вашем сервере. Это нужно для закона РК «О персональных данных и их защите»: данные должны храниться на территории РК.

## 1. Что нужно

- **VPS у провайдера в РК** (PS Cloud, Kazteleport, Hoster.kz и т. п.): 2 vCPU, 4 ГБ RAM, 40 ГБ SSD, Ubuntu 22.04/24.04. По возможности включите шифрование диска.
- **Домен**, например `journal.school.kz`, с A-записью на IP сервера.
- Доступ по SSH с ключом (вход по паролю на сервер лучше отключить).

## 2. Подготовка сервера

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install docker.io docker-compose-v2 git ufw unattended-upgrades
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

Порт базы данных наружу не открывается: PostgreSQL находится во внутренней сети Docker без выхода в интернет.

## 3. Установка

```bash
git clone https://github.com/festeast/toddle-.git journal && cd journal
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -hex 32          # вставьте результат в POSTGRES_PASSWORD
nano .env.production          # DOMAIN, APP_URL, POSTGRES_PASSWORD; Google — по желанию (раздел 6)
```

Для краткости ниже: `C="docker compose -f docker-compose.prod.yml --env-file .env.production"`.

```bash
$C build                                   # сборка образов (5–10 минут)
$C up -d db                                # база данных
$C --profile tools run --rm tools          # миграции схемы БД (prisma migrate deploy)
$C --profile tools run --rm tools node_modules/tsx/dist/cli.mjs scripts/setup-school.ts \
   --name "Лицей №1" --code LYC1 --admin-email admin@school.kz --admin-first Имя --admin-last Фамилия \
   --app-url https://journal.school.kz
$C up -d                                   # приложение, HTTPS, бэкапы
```

Скрипт настройки выведет **одноразовую ссылку** для установки пароля администратора. Она действует 72 часа. Откройте её и задайте пароль.

Проверка: `https://<домен>/api/health` возвращает `{"ok":true}`.

## 4. Загрузка учеников, родителей, учителей и курсов

Шаблоны лежат в `deploy/templates/`: `people.csv` и `courses.csv`. Их можно заполнить в Excel и сохранить как «CSV UTF-8» (разделитель `;` или `,`).

| Файл | Колонки |
|---|---|
| people.csv | `role` (admin, deputy, coordinator_myp, coordinator_dp, advisor, teacher, student, parent), `last_name`, `first_name`, `email`, `class` (7A, 10B, DP1; у куратора — его класс), `child_email` (у родителя: email детей через `\|`), `title`, `student_id`, `phone`, `relation` |
| courses.csv | `class`, `subject` (название из каталога, ru или en), `teacher_email` (несколько через `\|`), `level` (SL/HL для DP) |

```bash
mkdir -p data && cp ~/people.csv ~/courses.csv data/
IMPORT="$C --profile tools run --rm -v $PWD/data:/data:ro tools node_modules/tsx/dist/cli.mjs scripts/import.ts"
$IMPORT people /data/people.csv --dry-run     # сначала проверка без сохранения
$IMPORT people /data/people.csv
$IMPORT courses /data/courses.csv
```

Импорт выполняется в одной транзакции: если в файле есть ошибка, ничего не сохраняется, а в сообщении указана строка. Повторный запуск не создаёт дублей.

## 5. Как пользователи входят

- **Через Google** (если настроен, раздел 6). Сотрудники и ученики входят со школьного Google Workspace, родители — с личного Gmail. Email должен совпадать с тем, что указан в people.csv. Регистрации «с улицы» нет.
- **По паролю.** Пароль задаётся по одноразовой ссылке.
  - Одному человеку: «Люди» → имя → «Ссылка-приглашение». Ссылка показывается один раз.
  - Массово, например всем родителям:
    ```bash
    mkdir -p out && sudo chown 65532 out
    $C --profile tools run --rm -v $PWD/out:/out tools node_modules/tsx/dist/cli.mjs scripts/invite-links.ts --role parent --out /out/links.csv
    ```
    Файл содержит действующие ссылки для входа: разошлите их и **удалите файл**.

На той же странице пользователя администратор может заблокировать доступ (все сеансы завершаются сразу), завершить сеансы и посмотреть журнал входов.

## 6. Вход через Google (необязательно)

1. Откройте [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → OAuth consent screen. Тип: Internal, если входят только пользователи Workspace школы; External, если входят и родители с Gmail.
2. Credentials → Create credentials → OAuth client ID → Web application.
   Authorized redirect URI: `https://<домен>/auth/google/callback`.
3. В `.env.production` укажите `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` и `GOOGLE_ALLOWED_DOMAINS=school.kz`, затем выполните `$C up -d app`.

## 7. Обновление версии

```bash
git pull
$C build app tools
$C --profile tools run --rm tools          # новые миграции, если есть
$C up -d app
```

Перед обновлением убедитесь, что есть свежий бэкап (раздел 8).

## 8. Бэкапы и восстановление

- Контейнер `backup` делает сжатый дамп сразу при запуске и затем раз в сутки в `./backups/` (права 600). Хранятся 14 дней (`BACKUP_KEEP_DAYS`).
- **Храните копии вне сервера**, но в РК: например, `rsync` по ночам на второй сервер или в объектное хранилище провайдера. Пример для crontab на другом сервере:
  `0 3 * * * rsync -a journal-server:/home/ubuntu/journal/backups/ /srv/journal-backups/`
- **Проверка восстановления раз в месяц** (без влияния на рабочую базу):

```bash
F=$(ls backups/ | tail -1)
docker cp backups/$F ib-journal-db-1:/tmp/check.dump
$C exec -T db createdb -U journal restore_check
$C exec -T db pg_restore -U journal -d restore_check --no-owner /tmp/check.dump
$C exec -T db psql -U journal -d restore_check -c 'select count(*) from "User"'
$C exec -T db dropdb -U journal restore_check
```

- **Полное восстановление после аварии**: `$C stop app`, затем `dropdb` и `createdb journal`, затем `pg_restore` из дампа, затем `$C start app`.

## 9. Наблюдение

- `$C ps` показывает состояние; у `app` есть healthcheck.
- `$C logs -f app caddy` — журналы. Технические детали ошибок пишутся только в журнал, пользователь их не видит.
- Подключите внешний мониторинг доступности (например, UptimeRobot) к `https://<домен>/api/health`.
- Важные события (входы, ошибки входа, блокировки, изменения итоговых оценок, публикации, экспорт, импорт, выдача ссылок) записываются в «Журнал критичных изменений».

## 10. Демо-стенд (только вымышленные данные)

Чтобы показать систему без реальных данных, задайте в `.env.production` `DEMO_MODE=true` и заполните базу демо-данными:

```bash
$C --profile tools run --rm -e ALLOW_DEMO_SEED=true tools node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

Демо-заполнение **удаляет все данные**. Оно откажется запускаться, если в базе есть рабочая школа.
