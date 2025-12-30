#!/bin/bash
set -e

BACKUP_FILE="$1"
BACKUP_DIR="/backup/output"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: /restore.sh <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -la "${BACKUP_DIR}"/*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

# Check if file exists
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_DIR}/${BACKUP_FILE}"
    exit 1
fi

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
echo "  Plane Full Restore"
echo "============================================"
echo ""
echo "Backup file: ${BACKUP_FILE}"
echo ""

# Extract backup
RESTORE_DIR="${BACKUP_DIR}/restore_temp"
rm -rf "${RESTORE_DIR}"
mkdir -p "${RESTORE_DIR}"

echo "[1/4] Extracting backup archive..."
tar -xzf "${BACKUP_DIR}/${BACKUP_FILE}" -C "${RESTORE_DIR}"
BACKUP_NAME=$(ls "${RESTORE_DIR}")
echo "  ✓ Extracted: ${BACKUP_NAME}"

# Restore database
echo ""
echo "[2/4] Restoring PostgreSQL database..."
echo "  ⚠ This will DROP and recreate all tables!"
read -p "  Continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "  Aborted."
    rm -rf "${RESTORE_DIR}"
    exit 0
fi

# Drop and recreate database
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
" 2>/dev/null || true

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true

# Restore from dump
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "${RESTORE_DIR}/${BACKUP_NAME}/database/plane_db.sql" > /dev/null 2>&1
echo "  ✓ Database restored"

# Restore MinIO uploads
echo ""
echo "[3/4] Restoring MinIO uploads..."
MINIO_URL="http://${MINIO_HOST}:${MINIO_PORT}"
UPLOADS_DIR="${RESTORE_DIR}/${BACKUP_NAME}/uploads"

if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A $UPLOADS_DIR 2>/dev/null)" ]; then
    file_count=0
    
    # Ensure bucket exists
    curl -s -X PUT \
        -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
        "${MINIO_URL}/${MINIO_BUCKET}" 2>/dev/null || true
    
    # Upload all files
    find "$UPLOADS_DIR" -type f | while read file; do
        key="${file#$UPLOADS_DIR/}"
        curl -s -X PUT \
            -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
            -T "$file" \
            "${MINIO_URL}/${MINIO_BUCKET}/${key}" 2>/dev/null
        file_count=$((file_count + 1))
    done
    
    total_files=$(find "$UPLOADS_DIR" -type f | wc -l)
    echo "  ✓ Uploaded ${total_files} files to MinIO"
else
    echo "  ⚠ No uploads to restore"
fi

# Cleanup
echo ""
echo "[4/4] Cleaning up..."
rm -rf "${RESTORE_DIR}"
echo "  ✓ Temporary files removed"

echo ""
echo "============================================"
echo "  Restore Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Restart the API: docker compose restart plane-api"
echo "  2. Clear cache: docker exec plane-plane-api-1 python manage.py clear_cache"
echo "  3. Access: http://localhost:3005"
echo ""
