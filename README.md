# Plane Self-Host (Personal Fork)

Local-only Plane OSS stack for personal use. No SaaS dependencies, no upgrade banners, all state kept on your machine.

## Goals
- Run entirely on localhost (edge on 3005).
- Keep all state under `./data/` for easy backups and restores.
- Stay within Plane OSS licensing; no Pro/paid unlocks or bypasses.
- Minimal services: Postgres, Redis, RabbitMQ, MinIO, API, Web, Edge proxy, Celery worker/beat, one-shot migrator, and backup jobs.

## Stack (docker-compose)
- `plane-edge`: nginx entry on http://localhost:3005 (proxies web + /api).
- `plane-web`: Next.js frontend built from `plane-1.2.1/apps/web` (API base baked to edge).
- `plane-api`: Django API from `plane-1.2.1/apps/api`.
- `plane-worker`, `plane-beat`: Celery worker and scheduler.
- `plane-migrator`: Run DB migrations once.
- `plane-db`: Postgres 15.
- `plane-redis`: Redis 7 (Celery result backend).
- `plane-mq`: RabbitMQ 3.13 (Celery broker, internal only).
- `plane-minio`: Object storage; `create-bucket` seeds bucket.
- `db-backup`, `minio-backup`: Looping backups for DB and bucket.

## Data layout
All stateful data lives under `./data/`:
- data/postgres
- data/redis
- data/rabbitmq
- data/minio (uploads bucket contents)
- data/backups/db
- data/backups/minio

If you previously used `./pgdata`, `./redisdata`, `./rabbitmqdata`, or `./uploads`, move those into the matching `./data/*` paths before restart.

## One-time migration (legacy folders → ./data)
- Stop stack: `docker compose -f docker-compose.yaml down` (use `-f` to avoid the older docker-compose.yml).
- Copy old data into `./data/` (keep originals until you verify):
  - `pgdata` → `data/postgres`
  - `redisdata` → `data/redis`
  - `rabbitmqdata` → `data/rabbitmq`
  - `uploads` → `data/minio`
  - `backups/db` → `data/backups/db`, `backups/minio` → `data/backups/minio`
- Example (PowerShell):
  ```pwsh
  Set-Location E:\2025\plane-selfhost
  robocopy .\pgdata .\data\postgres /E
  robocopy .\redisdata .\data\redis /E
  robocopy .\rabbitmqdata .\data\rabbitmq /E
  robocopy .\uploads .\data\minio /E
  robocopy .\backups\db .\data\backups\db /E
  robocopy .\backups\minio .\data\backups\minio /E
  ```
- Start stack on new volumes: `docker compose -f docker-compose.yaml up -d --build`.

## Prerequisites
- Docker + Docker Compose
- ~6–8 GB RAM free for full stack

## Configure
- Set secrets in `docker-compose.yaml` (at minimum `SECRET_KEY`; also MinIO creds, email if needed).
- Keep `WEB_URL`/`CORS_ALLOWED_ORIGINS` aligned with http://localhost:3005 unless you intentionally change host/port.
- Telemetry/third-party hooks are off unless you provide keys.

## Quick start
1) From repo root: `docker compose up -d --build`
2) Wait for `plane-migrator` to finish; `plane-api` and `plane-web` should stay healthy after.
3) Open http://localhost:3005.

## First login / auth fixes
- Create superuser if none exists:
  `docker exec -it plane-selfhost-plane-api-1 python manage.py createsuperuser`
- If stuck on welcome/401 loop, run:
  `docker exec plane-selfhost-plane-api-1 python manage.py create_instance_admin <email>`
  `docker exec plane-selfhost-plane-api-1 python manage.py shell -c "from plane.license.models import Instance; i=Instance.objects.first(); i.is_setup_done=True; i.is_signup_screen_visited=True; i.domain='http://localhost:3005'; i.save();"`
- Edge already rewrites `/god-mode` back to `/` to keep routes normal.

## Common ops
- Logs (edge + api): `docker compose logs -f plane-edge plane-api`
- Rebuild web after UI changes: `docker compose build plane-web && docker compose up -d plane-web plane-edge`
- Rerun migrations: `docker compose run --rm plane-migrator`
- Stop stack: `docker compose down`

## Dev loop (local code edits)
- Web changes (apps/web): edit code, then `docker compose build plane-web && docker compose up -d plane-web plane-edge`.
- API changes (apps/api): edit code, then `docker compose build plane-api && docker compose up -d plane-api plane-worker plane-beat`.
- Migrations: create migration, then `docker compose run --rm plane-migrator`.
- Keep origin on http://localhost:3005; if you change host/port, update the VITE* build args and WEB_URL/CORS_ALLOWED_ORIGINS in compose.

## Rehydrate on any machine
- Install Docker + Compose.
- Clone this repo.
- Restore `./data/` from backup (or at least `data/postgres`, `data/minio`, and `data/backups/*`).
- Set secrets in docker-compose.yaml (SECRET_KEY, MinIO creds, email if used).
- Run `docker compose -f docker-compose.yaml up -d --build`.
- Login at http://localhost:3005; if needed, recreate a superuser as noted above.

## Backups and restore
- Postgres dumps land in `data/backups/db` (default every 24h). Tune `BACKUP_INTERVAL` env.
- MinIO mirror lands in `data/backups/minio` (same interval).
- Restore Postgres: stop writers, copy dump into container or mount, then `docker compose exec plane-db psql -U plane -d plane -f /backups/<dump>.sql`.
- Restore uploads: stop `plane-minio`, replace `data/minio` from backup, start again.

## Constraints and notes
- Personal/local use only; do not enable Pro/SaaS flows or bypass license checks.
- Keep browser origin on http://localhost:3005 to avoid CORS/cookie issues. If you change hosts/ports, update `VITE_*_BASE_URL` build args and `WEB_URL`/`CORS_ALLOWED_ORIGINS` in compose.
- No external telemetry unless you opt in with your own keys.
- Compose files: prefer `docker-compose.yaml`. `docker-compose.yml` and `docker-compose-local.yml` are legacy/dev; only use them explicitly with `-f` to avoid the wrong stack.
- AI helper rules live in .github/instructions/Copilot.instructions.md.

## License
Plane OSS is licensed under AGPLv3. See LICENSE.txt for details.
