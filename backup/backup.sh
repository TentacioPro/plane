#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/backup/output"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="plane_full_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Database connection
DB_HOST="${DB_HOST:-plane-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-plane}"
DB_NAME="${DB_NAME:-plane}"
PGPASSWORD="${DB_PASSWORD:-plane}"
export PGPASSWORD

# MinIO connection
MINIO_HOST="${MINIO_HOST:-plane-minio}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-plane-uploads}"

echo "============================================"
echo "  Plane Full Backup - ${TIMESTAMP}"
echo "============================================"

# Create backup directory structure
mkdir -p "${BACKUP_PATH}/database"
mkdir -p "${BACKUP_PATH}/uploads"
mkdir -p "${BACKUP_PATH}/metadata"

# 1. Database backup (full dump)
echo ""
echo "[1/4] Backing up PostgreSQL database..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl \
    -f "${BACKUP_PATH}/database/plane_db.sql"
echo "  ✓ Database dumped: $(du -h ${BACKUP_PATH}/database/plane_db.sql | cut -f1)"

# 2. Export key tables as JSON for easy inspection/partial restore
echo ""
echo "[2/4] Exporting entity data as JSON..."

# Function to export table to JSON
export_table() {
    local table=$1
    local output=$2
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A \
        -c "SELECT json_agg(t) FROM (SELECT * FROM $table) t" \
        > "${BACKUP_PATH}/metadata/${output}.json" 2>/dev/null || echo "[]" > "${BACKUP_PATH}/metadata/${output}.json"
    local count=$(cat "${BACKUP_PATH}/metadata/${output}.json" | jq 'length // 0' 2>/dev/null || echo "0")
    echo "  - ${output}: ${count} records"
}

# Core user data
export_table "users" "users"
export_table "profiles" "profiles"
export_table "accounts" "accounts"

# Workspace data
export_table "workspaces" "workspaces"
export_table "workspace_members" "workspace_members"
export_table "workspace_member_invites" "workspace_member_invites"

# Project data
export_table "projects" "projects"
export_table "project_members" "project_members"
export_table "project_favorites" "project_favorites"

# Issue tracking
export_table "states" "states"
export_table "labels" "labels"
export_table "issues" "issues"
export_table "issue_comments" "issue_comments"
export_table "issue_activities" "issue_activities"
export_table "issue_attachments" "issue_attachments"
export_table "issue_links" "issue_links"
export_table "issue_reactions" "issue_reactions"
export_table "issue_subscribers" "issue_subscribers"
export_table "issue_assignees" "issue_assignees"
export_table "issue_labels" "issue_labels"

# Modules & Cycles
export_table "modules" "modules"
export_table "module_members" "module_members"
export_table "module_issues" "module_issues"
export_table "module_links" "module_links"
export_table "module_favorites" "module_favorites"
export_table "cycles" "cycles"
export_table "cycle_issues" "cycle_issues"
export_table "cycle_favorites" "cycle_favorites"

# Pages & Views
export_table "pages" "pages"
export_table "page_favorites" "page_favorites"
export_table "issue_views" "issue_views"
export_table "issue_view_favorites" "issue_view_favorites"

# Estimates
export_table "estimates" "estimates"
export_table "estimate_points" "estimate_points"

# Integrations & API
export_table "api_tokens" "api_tokens"
export_table "webhooks" "webhooks"
export_table "integrations" "integrations"

# Instance config
export_table "instances" "instances"
export_table "instance_admins" "instance_admins"
export_table "instance_configurations" "instance_configurations"

# File assets
export_table "file_assets" "file_assets"

# 3. MinIO uploads backup
echo ""
echo "[3/4] Backing up MinIO uploads..."

# Download all files from MinIO bucket using curl
MINIO_URL="http://${MINIO_HOST}:${MINIO_PORT}"

# List all objects in bucket and download them
list_response=$(curl -s -X GET \
    -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
    "${MINIO_URL}/${MINIO_BUCKET}?list-type=2" 2>/dev/null || echo "")

if [ -n "$list_response" ]; then
    # Parse XML response to get object keys (compatible with busybox)
    keys=$(echo "$list_response" | sed -n 's/.*<Key>\([^<]*\)<\/Key>.*/\1/gp' | tr ' ' '\n' || echo "")
    
    file_count=0
    for key in $keys; do
        [ -z "$key" ] && continue
        # Create directory structure
        dir=$(dirname "${BACKUP_PATH}/uploads/${key}")
        mkdir -p "$dir"
        
        # Download file
        curl -s -X GET \
            -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
            "${MINIO_URL}/${MINIO_BUCKET}/${key}" \
            -o "${BACKUP_PATH}/uploads/${key}" 2>/dev/null && file_count=$((file_count + 1))
    done
    echo "  ✓ Downloaded ${file_count} files from MinIO"
else
    echo "  ⚠ Could not connect to MinIO or bucket is empty"
fi

# 4. Create compressed archive
echo ""
echo "[4/4] Creating compressed archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

FINAL_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
echo "  ✓ Archive created: ${BACKUP_NAME}.tar.gz (${FINAL_SIZE})"

echo ""
echo "============================================"
echo "  Backup Complete!"
echo "============================================"
echo ""
echo "Output: /backup/output/${BACKUP_NAME}.tar.gz"
echo ""
echo "Contents:"
echo "  - database/plane_db.sql    (full PostgreSQL dump)"
echo "  - metadata/*.json          (entity data for inspection)"
echo "  - uploads/                  (MinIO files)"
echo ""
echo "To restore, run:"
echo "  docker compose run --rm plane-backup /restore.sh ${BACKUP_NAME}.tar.gz"
echo ""
