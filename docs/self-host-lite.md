# Lite Mode Self-Hosting Guide

This guide details the architecture and maintenance of the "Lite Mode" configuration (`docker-compose-pc.yaml`), designed for personal self-hosting on hardware with limited resources.

## Included Services

The Lite Mode stack removes redundant enterprise features to save approximately 50% RAM. The following services are included:

- **plane-web**: The frontend application (Next.js).
- **plane-api**: The backend API (Django).
- **plane-worker**: Asynchronous task worker (Celery).
- **plane-db**: PostgreSQL database.
- **plane-redis**: Redis for caching and task queue results.
- **plane-mq**: RabbitMQ for task message brokering.
- **plane-minio**: MinIO object storage for file uploads.
- **plane-edge**: Nginx reverse proxy (restored for stability and routing).
- **tunnel**: Cloudflare Tunnel for secure public access without opening ports.

## Maintenance Commands

**Start/Update System:**

```bash
docker compose -f docker-compose-pc.yaml up -d --remove-orphans
```

**Rebuild Frontend (If changing URLs):**

```bash
docker compose -f docker-compose-pc.yaml up -d --build plane-web
```

## Manual Backups

To conserve memory, the automated backup sidecars (`db-backup`, `minio-backup`, `plane-backup`) have been removed. You must perform backups manually.

### Database Backup

Run the following command to dump the PostgreSQL database to a SQL file on your host machine:

```bash
docker exec -t plane-db pg_dumpall -c -U plane > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql
```

### Restore

To restore a database dump:

```bash
cat your_dump_file.sql | docker exec -i plane-db psql -U plane
```
