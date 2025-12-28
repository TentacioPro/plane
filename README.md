# Plane Self-Host (Personal Fork)

Local-only Plane OSS stack for personal use. No SaaS dependencies, no upgrade banners, all state kept on your machine.

## Goals

- Run entirely on localhost (edge on 3005).
- Keep all state under `./data/` for easy backups and restores.
- Stay within Plane OSS licensing; no Pro/paid unlocks or bypasses.
- Minimal services: Postgres, Redis, RabbitMQ, MinIO, API, Web, Edge proxy, Celery worker/beat, one-shot migrator, and backup jobs.

## Stack (docker-compose)

## Topology & ports

- Single bridge network `plane-net`.
- Edge/http entry: http://localhost:3005 (web + /api proxied to plane-api:8000/api/, /uploads proxied to MinIO).
- API direct (debug): http://localhost:3006.
- MinIO: S3 9000, console 9001 (uploads accessible via edge proxy at /uploads/).

## Runtime & routing notes

- Edge rewrites `/god-mode` and `/god-mode/*` back to `/` to avoid redirect loops; keep browser on 3005 origin for cookies.
- Edge proxies `/uploads/` to MinIO for image/file access (fixes 403 Forbidden errors).
- Edge waits for plane-web health and resolves upstream via Docker DNS to avoid stale IPs.
- Health: Postgres `pg_isready`, Redis `redis-cli ping`, MinIO HTTP live, API TCP 8000. Migrator must finish before API is steady.

## Data layout

All stateful data lives under `./data/`:

- data/postgres
- data/redis
- data/rabbitmq
- data/minio (uploads bucket contents)
- data/backups/db
- data/backups/minio

If you previously used `./pgdata`, `./redisdata`, `./rabbitmqdata`, or `./uploads`, move those into the matching `./data/*` paths before restart.

## Upgrade notes (1.2.1 source build)

- Celery broker now RabbitMQ (`amqp://plane:plane@plane-mq:5672/plane`); Redis used for results.
- Frontend build args point to edge (http://localhost:3005) to avoid double /api.
- Pro/upgrade banners not yet stripped—patch web source before rebuild if desired.

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

1. From repo root: `docker compose up -d --build`
2. Wait for `plane-migrator` to finish; `plane-api` and `plane-web` should stay healthy after.
3. Open http://localhost:3005.

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
- Restart edge (after config changes): `docker restart plane-plane-edge-1`
- Stop stack: `docker compose down`

## Troubleshooting

### Profile pictures not loading (403 Forbidden)

- **Cause**: MinIO proxy misconfigured or bucket not public
- **Fix**: Already applied in `edge.conf` - `/uploads/` proxies to MinIO with correct Host header
- **Bucket policy**: `plane-uploads` set to public download access
- **Test**: `curl -I http://localhost:3005/uploads/plane-uploads/` should return 200 OK
- **Action**: Hard refresh browser (Ctrl+Shift+R) and re-upload images if needed
- **Verify permissions**:
  ```bash
  docker exec plane-plane-minio-1 mc anonymous get local/plane-uploads
  # Should show: download
  ```

### React console errors (#418, #423)

- **Impact**: Cosmetic only, app functions normally
- **Cause**: Production build hydration mismatches
- **Action**: Safe to ignore unless app breaks

## Dev loop (local code edits)

- Web changes (apps/web): edit code, then `docker compose build plane-web && docker compose up -d plane-web plane-edge`.
- API changes (apps/api): edit code, then `docker compose build plane-api && docker compose up -d plane-api plane-worker plane-beat`.
- Migrations: create migration, then `docker compose run --rm plane-migrator`.
- Keep origin on http://localhost:3005; if you change host/port, update the VITE\* build args and WEB_URL/CORS_ALLOWED_ORIGINS in compose.

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

## Portable data (plug-and-play)

- Stop services: `docker compose down` (uses current docker-compose.yaml).
- Package everything: `Compress-Archive -Path .\data -DestinationPath .\plane-data-$(Get-Date -Format yyyyMMddHHmm).zip` (PowerShell). Keep the archive alongside the repo.
- Move to another machine: unzip into the repo root so you get `./data/postgres`, `./data/minio`, etc.; ensure folder names match exactly.
- Bring it up: `docker compose up -d --build`.
- Validate: API on http://localhost:3006 responds, edge on http://localhost:3005 loads, and MinIO console on http://localhost:9001 shows the expected uploads bucket.

## Issue export (built-in, local-only)

- Endpoint: `POST /api/workspaces/<slug>/export-issues/` with JSON body `{"provider":"csv","project":["<project-uuid>"],"multiple":false}`. Omitting `project` exports all projects you can access. Allowed providers: `csv`, `json`, `xlsx`.
- Auth: session cookie or `Authorization: Bearer <api-token>` (create via UI /api-tokens).
- Background worker: requires `plane-worker` + `plane-beat` to be running; output is zipped and stored in MinIO (`data/minio` -> `plane-uploads` bucket).
- Poll status: `GET /api/workspaces/<slug>/export-issues/?per_page=20&cursor=` returns `status`, `url`, and `token`. When `status` becomes `completed`, `url` is a presigned download.
- Manual fetch alternative: open MinIO console (http://localhost:9001), bucket `plane-uploads`, key pattern `<workspace-id>/export-<slug>-<token>-<date>.zip`.

## Bulk Import

### UI Access

Click the **"Bulk import/export"** button on the workspace dashboard header (http://localhost:3005/projects/). The modal provides:

- **Full Project Import**: Upload single JSON with all entities (states, labels, modules, cycles, pages, issues)
- **Single Entity Import**: Upload JSON array for specific entity type
- **Template Downloads**: Pre-built templates for both scenarios
- **Auto-detection**: Automatically detects import mode from file structure
- **Progress Tracking**: Shows success/failure counts with error details
- **API Schema Reference**: Expandable documentation for each endpoint
- **Cross-Reference Support**: Use `temp_id` to reference entities before creation
- **Module/Cycle Linking**: Issues can be linked to modules and cycles via separate API calls

### API-Based Import

Use the REST API to bulk-populate your workspace. Auth required: `X-API-Key: <api-token>` header (create at `/{workspace}/settings/api-tokens/`).

**Import Order** (to avoid validation errors):

1. States → 2. Labels → 3. Modules → 4. Cycles → 5. Issues

**Key Endpoints (API v1):**
| Entity | Endpoint |
|--------|----------|
| State | `POST /api/v1/workspaces/{slug}/projects/{project_id}/states/` |
| Label | `POST /api/v1/workspaces/{slug}/projects/{project_id}/labels/` |
| Module | `POST /api/v1/workspaces/{slug}/projects/{project_id}/modules/` |
| Cycle | `POST /api/v1/workspaces/{slug}/projects/{project_id}/cycles/` |
| Issue | `POST /api/v1/workspaces/{slug}/projects/{project_id}/issues/` |

**Full Project Template:**

```json
{
  "states": [
    { "name": "Backlog", "color": "#6B7280", "group": "backlog" },
    { "name": "Done", "color": "#10B981", "group": "completed" }
  ],
  "labels": [{ "name": "bug", "color": "#EF4444" }],
  "modules": [{ "name": "Core Module", "status": "planned" }],
  "cycles": [
    {
      "name": "Sprint 1",
      "start_date": "2025-01-01T00:00:00Z",
      "end_date": "2025-01-14T00:00:00Z",
      "project_id": "<project-uuid>"
    }
  ],
  "issues": [{ "name": "Task 1", "priority": "high", "description_html": "<p>Description</p>" }]
}
```

**Single Issue Payload:**

```json
{
  "name": "Implement feature",
  "description_html": "<p>Feature description</p>",
  "priority": "high",
  "state_id": "<state-uuid>",
  "assignee_ids": ["<user-uuid>"],
  "label_ids": ["<label-uuid>"],
  "start_date": "2025-12-29",
  "target_date": "2026-01-15"
}
```

**Enum Values:**

- Priority: `urgent`, `high`, `medium`, `low`, `none`
- State groups: `backlog`, `unstarted`, `started`, `completed`, `cancelled`
- Module status: `backlog`, `planned`, `in-progress`, `paused`, `completed`, `cancelled`

**Quick Import Script (PowerShell):**

```powershell
$token = "your-api-token"
$baseUrl = "http://localhost:3005"
$workspace = "your-workspace-slug"
$project = "your-project-uuid"

$headers = @{ "X-API-Key" = $token; "Content-Type" = "application/json" }

# Create an issue
$issue = @{
  name = "My imported issue"
  description_html = "<p>Imported via API</p>"
  priority = "medium"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/api/v1/workspaces/$workspace/projects/$project/issues/" -Method POST -Headers $headers -Body $issue
```

**Test Script:**
Run `python test_bulk_import.py` to verify all APIs are working (requires `requests` package).

**Fork Progress Import:**
Run `python import_fork_progress.py` to import this fork's development progress into Plane itself as a meta-project tracking all enhancements.

See `BULK_IMPORT_FEATURE.md` for complete schema documentation.

## Constraints and notes

- Personal/local use only; do not enable Pro/SaaS flows or bypass license checks.
- Keep browser origin on http://localhost:3005 to avoid CORS/cookie issues. If you change hosts/ports, update `VITE_*_BASE_URL` build args and `WEB_URL`/`CORS_ALLOWED_ORIGINS` in compose.
- No external telemetry unless you opt in with your own keys.
- Compose files: prefer `docker-compose.yaml`. `docker-compose.yml` and `docker-compose-local.yml` are legacy/dev; only use them explicitly with `-f` to avoid the wrong stack.
- AI helper rules live in .github/instructions/Copilot.instructions.md.

## License

Plane OSS is licensed under AGPLv3. See LICENSE.txt for details.
