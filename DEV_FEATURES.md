# Development Features & Customizations

This document tracks all custom modifications made to this Plane fork for self-hosted convenience.

## Password Validation Bypass

### Problem
Plane enforces strict password strength validation (zxcvbn score >= 3) which is frustrating for local/self-hosted development.

### Solution
Added `BYPASS_PASSWORD_VALIDATION` environment variable to skip password strength checks.

**Files Modified:**
- `apps/api/plane/authentication/adapter/base.py` - Backend password validation
- `apps/api/plane/authentication/views/common.py` - Password change validation
- `apps/web/core/components/account/auth-forms/password.tsx` - Frontend checkbox
- `docker-compose.yaml` - Environment variable

**Usage:**
```yaml
# docker-compose.yaml
plane-api:
  environment:
    BYPASS_PASSWORD_VALIDATION: "1"  # Set to "0" to re-enable
```

**Frontend:** Checkbox "Skip password strength check (self-hosted)" appears on signup page.

---

## Auto Instance Setup

### Problem
Fresh installs show "Getting Started" page requiring manual database commands to bypass.

### Solution
API entrypoint automatically marks instance as setup complete on startup.

**Files Modified:**
- `apps/api/bin/docker-entrypoint-api.sh`

**Behavior:**
On every API startup, if `is_setup_done=False`, it's automatically set to `True` along with `is_signup_screen_visited=True`.

---

## Full Backup Container

### Problem
Need comprehensive backup/restore that captures all data (DB + uploads + metadata) in a portable format.

### Solution
Created `plane-backup` container with full backup/restore scripts.

**Files Created:**
- `backup/Dockerfile`
- `backup/backup.sh`
- `backup/restore.sh`

**Usage:**
```powershell
# Create full backup
docker compose --profile backup run --rm plane-backup /backup.sh

# List backups
docker compose --profile backup run --rm plane-backup ls -la /backup/output/

# Restore from backup
docker compose --profile backup run --rm plane-backup /restore.sh plane_full_backup_YYYYMMDD_HHMMSS.tar.gz
```

**Backup Contents:**
- `database/plane_db.sql` - Full PostgreSQL dump
- `metadata/*.json` - Entity data as JSON (users, projects, issues, etc.)
- `uploads/` - MinIO files (profile pictures, attachments)

**Output Location:** `data/backups/full/`

---

## Bulk Import/Export Modal

### Problem
No UI for bulk data import; only CLI/API available.

### Solution
Added comprehensive bulk import modal with full entity sync support.

**Files Modified:**
- `apps/web/core/components/import-export/bulk-import-export-modal.tsx`
- `apps/web/app/(all)/[workspaceSlug]/(projects)/header.tsx`

**Features:**
- Full project import (states, labels, modules, cycles, pages, issues)
- Single entity import
- Template downloads
- Cross-reference support via `temp_id`
- Module-Issue and Cycle-Issue post-creation linking
- API schema reference

---

## API Modifications

### Authentication Endpoints

| Endpoint | Modification |
|----------|--------------|
| `POST /auth/sign-up/` | Password validation bypass when `BYPASS_PASSWORD_VALIDATION=1` |
| `POST /api/users/me/change-password/` | Same bypass logic |

### API v1 Endpoints (Used by Bulk Import)

| Entity | Endpoint | Auth |
|--------|----------|------|
| State | `POST /api/v1/workspaces/{slug}/projects/{project_id}/states/` | X-API-Key |
| Label | `POST /api/v1/workspaces/{slug}/projects/{project_id}/labels/` | X-API-Key |
| Module | `POST /api/v1/workspaces/{slug}/projects/{project_id}/modules/` | X-API-Key |
| Cycle | `POST /api/v1/workspaces/{slug}/projects/{project_id}/cycles/` | X-API-Key |
| Page | `POST /api/workspaces/{slug}/projects/{project_id}/pages/` | Session |
| Issue | `POST /api/v1/workspaces/{slug}/projects/{project_id}/issues/` | X-API-Key |
| Module-Issue | `POST /api/v1/.../modules/{module_id}/module-issues/` | X-API-Key |
| Cycle-Issue | `POST /api/v1/.../cycles/{cycle_id}/cycle-issues/` | X-API-Key |

**Note:** Pages use session auth (not API v1) because the `/api/v1/` page endpoint doesn't exist.

---

## Removed/Bypassed Features

### God-Mode Admin Panel
- **Status:** Routing disabled
- **Reason:** Causes redirect loops in self-hosted setup
- **Implementation:** `edge.conf` rewrites `/god-mode/*` to `/`

### Setup Wizard
- **Status:** Auto-bypassed
- **Reason:** Unnecessary for self-hosted; blocks access to login
- **Implementation:** Auto-set `is_setup_done=True` on API startup

### Password Strength Indicator (Optional)
- **Status:** Can be hidden via checkbox
- **Reason:** Annoying for local development
- **Implementation:** Frontend checkbox + backend env var

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BYPASS_PASSWORD_VALIDATION` | `"0"` | Set to `"1"` to skip password strength checks |
| `BACKUP_INTERVAL` | `86400` | Seconds between automatic backups (24h) |

---

## Docker Services

### Core Services
- `plane-web` - Frontend (Next.js)
- `plane-api` - Backend API (Django)
- `plane-worker` - Celery worker
- `plane-beat` - Celery beat scheduler
- `plane-edge` - Nginx reverse proxy
- `plane-db` - PostgreSQL
- `plane-redis` - Redis
- `plane-minio` - Object storage
- `plane-mq` - RabbitMQ

### Utility Services
- `plane-migrator` - Database migrations (one-shot)
- `create-bucket` - MinIO bucket setup (one-shot)
- `db-backup` - Automatic PostgreSQL backups
- `minio-backup` - Automatic MinIO backups
- `plane-backup` - Manual full backup/restore (profile: backup)

---

## File Structure

```
plane/
├── backup/
│   ├── Dockerfile
│   ├── backup.sh
│   └── restore.sh
├── data/
│   ├── postgres/
│   ├── redis/
│   ├── rabbitmq/
│   ├── minio/
│   └── backups/
│       ├── db/          # Auto PostgreSQL dumps
│       ├── minio/       # Auto MinIO mirrors
│       └── full/        # Manual full backups
├── apps/
│   ├── api/
│   │   ├── bin/docker-entrypoint-api.sh  # Modified
│   │   └── plane/authentication/         # Modified
│   └── web/
│       └── core/components/
│           ├── account/auth-forms/password.tsx  # Modified
│           └── import-export/bulk-import-export-modal.tsx  # Modified
├── docker-compose.yaml  # Modified
├── edge.conf           # Modified
├── DEV_FEATURES.md     # This file
├── BULK_IMPORT_FEATURE.md
├── SETUP_GUIDE.md
└── README.md
```

---

## Quick Reference

### Rebuild After Changes
```powershell
# Frontend changes
docker compose build plane-web && docker compose up -d plane-web

# Backend changes
docker compose build plane-api && docker compose up -d plane-api plane-worker plane-beat

# Full rebuild
docker compose up -d --build
```

### Create Full Backup
```powershell
docker compose --profile backup run --rm plane-backup /backup.sh
```

### Restore Full Backup
```powershell
docker compose --profile backup run --rm plane-backup /restore.sh <backup_file.tar.gz>
docker compose restart plane-api
docker exec plane-plane-api-1 python manage.py clear_cache
```

### Clear Cache
```powershell
docker exec plane-plane-api-1 python manage.py clear_cache
```
