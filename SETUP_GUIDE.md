# Plane Self-Host Setup Guide

This guide provides step-by-step instructions to set up the Plane project management system on your local machine using Docker.

## Quick Start (New Machine)

### Standard Setup (Recommended)

1. **Clone the repository:**

   ```bash
   git clone https://github.com/TentacioPro/plane.git
   cd plane
   ```

2. **Start all services:**
   ```bash
   docker compose up -d --build
   ```

### Lite Mode (Low RAM)

For personal use on hardware with limited RAM (<8GB), use the optimized PC configuration.

1. **Start Lite services:**

   ```bash
   docker compose -f docker-compose-pc.yaml up -d
   ```

   > **Note:** This mode skips the initial migration container to save resources. The API container will handle migrations automatically on first boot.

2. **Wait for services to be ready** (2-3 minutes):

   ```bash
   docker compose logs -f plane-api
   # Wait for "Starting gunicorn" message, then Ctrl+C
   ```

3. **Access the application:**
   - Open http://localhost:3005
   - Sign up with any email/password (password validation is bypassed)
   - Create your first workspace

That's it! The instance is automatically configured on startup.

---

## Prerequisites

Ensure you have the following installed on your system:

- **Git**: [Download Git](https://git-scm.com/downloads)
- **Docker Desktop**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) (Ensure it is running)

## Installation Steps

### 1. Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone https://github.com/TentacioPro/plane.git
cd plane
```

### 2. Configure Environment Variables

The project comes with a pre-configured `docker-compose.yaml` that sets up necessary environment variables. Key configurations:

- **MinIO (Object Storage)**:
  - Access Key: `minioadmin`
  - Secret Key: `minioadmin`
  - External endpoint is configured for localhost access

- **Admin Base Path**:
  - Set to empty string (`""`) to avoid god-mode routing issues
  - This allows direct access to the application without path rewrites

- **API Healthcheck**:
  - Optimized with reduced delays (20s start period, 10s interval)
  - Ensures faster container startup

### 3. Start the Application

Run the following command to start all services:

```bash
docker-compose up -d --build
```

This command will build and start all containers. Initial build may take 5-10 minutes.

### 4. Wait for Services to be Ready

Monitor the startup process:

```bash
docker-compose logs -f plane-api
```

Wait until you see "Starting gunicorn" and worker processes booting. Press Ctrl+C to exit logs.

### 5. Access the Application

Once the containers are running, you can access:

- **Web App**: [http://localhost:3005](http://localhost:3005)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Pass: `minioadmin`)
- **API Direct**: [http://localhost:3006](http://localhost:3006)

### 6. Initial Setup & User Creation

#### Automatic Setup (Default)

This fork automatically marks the instance as setup complete on API startup. Simply:

1. Open [http://localhost:3005](http://localhost:3005)
2. You should see the **Sign Up / Login** page directly
3. Create your account (password validation is bypassed by default)

#### Manual Setup (If Needed)

If you still see a setup/maintenance screen:

```bash
docker exec plane-plane-api-1 python -c "
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.production')
sys.path.insert(0, '/code')
django.setup()
from plane.license.models import Instance
i = Instance.objects.last()
i.is_setup_done = True
i.is_signup_screen_visited = True
i.save()
print('Setup marked complete')
"
docker exec plane-plane-api-1 python manage.py clear_cache
docker restart plane-plane-api-1
```

3. Refresh the browser and you should see the login page
4. Sign up with your email and create your account

#### Option B: Create User via Script

If you prefer to create a user directly:

1. Create a user creation script:

   ```python
   # create_user.py
   import os, sys, django
   os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.production')
   sys.path.insert(0, '/code')
   django.setup()

   from django.contrib.auth.hashers import make_password
   from plane.db.models import User

   email = "your-email@example.com"
   username = "your_username"
   password = "your_password"

   user = User.objects.create(
       email=email,
       username=username,
       password=make_password(password),
       is_active=True,
       is_email_verified=True,
       display_name=username,
   )
   print(f"User created: {user.email}")
   ```

2. Copy and run the script:

   ```bash
   docker cp create_user.py plane-plane-api-1:/code/
   docker exec plane-plane-api-1 python /code/create_user.py
   ```

3. Mark instance as setup (see Option A step 2)

4. Login at [http://localhost:3005](http://localhost:3005)

## Common Issues & Solutions

### Issue 1: Login Page Not Showing (Setup/Maintenance Screen)

**Symptom**: Browser shows setup wizard or maintenance screen instead of login page.

**Cause**: Instance not marked as setup complete (`is_setup_done: false`).

**Solution**:

```bash
# Mark instance as setup complete
docker exec plane-plane-api-1 python -c "
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.production')
sys.path.insert(0, '/code')
django.setup()
from plane.license.models import Instance
i = Instance.objects.last()
i.is_setup_done = True
i.is_signup_screen_visited = True
i.save()
"

# Clear cache and restart
docker exec plane-plane-api-1 python manage.py clear_cache
docker restart plane-plane-api-1
```

Wait 15-20 seconds for the API to restart, then refresh your browser.

### Issue 2: Redirected to Onboarding After Login

**Symptom**: After successful login, you're taken to onboarding flow instead of workspace.

**Cause**: User profile not marked as onboarded.

**Solution**:

```bash
# Mark user as onboarded
docker exec plane-plane-api-1 python -c "
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.production')
sys.path.insert(0, '/code')
django.setup()
from plane.db.models import User
user = User.objects.get(email='your-email@example.com')
profile = user.profile
profile.is_onboarded = True
profile.is_tour_completed = True
profile.onboarding_step = {
    'profile_complete': True,
    'workspace_create': True,
    'workspace_invite': True,
    'workspace_join': True,
}
profile.save()
print('User onboarded')
"
```

**Alternative**: Just complete the onboarding flow in the browser - it's quick and helps you set up your first workspace.

### Issue 3: Profile Pictures and Images Not Loading

**Symptom**: Profile pictures show as broken images, browser shows 403 Forbidden errors.

**Root Cause**: MinIO storage not properly proxied through nginx, or bucket permissions not set.

**Solution**: Already fixed in this repository with:

1. **Nginx proxy configuration** (`edge.conf`):

```nginx
location /uploads/ {
  rewrite ^/uploads/(.*)$ /$1 break;
  proxy_pass http://plane-minio:9000;
  proxy_set_header Host plane-minio:9000;  # Critical for MinIO signature validation
  # ... other headers
}
```

2. **Environment variable** (`docker-compose.yaml`):

```yaml
MINIO_EXTERNAL_ENDPOINT_URL: http://localhost:3005/uploads
```

3. **MinIO bucket permissions**:

```bash
# Set bucket to public download (already done in setup)
docker exec plane-plane-minio-1 mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec plane-plane-minio-1 mc anonymous set download local/plane-uploads
```

**If images still don't load after setup:**

1. **Verify bucket permissions**:

```bash
docker exec plane-plane-minio-1 mc anonymous get local/plane-uploads
# Should show: Access permission for 'local/plane-uploads' is 'download'
```

2. **Hard refresh browser** (Ctrl+Shift+R) to clear cached URLs

3. **Test proxy directly**:

```bash
curl -I http://localhost:3005/uploads/plane-uploads/
# Should return 200 OK
```

4. **Re-upload profile pictures** - old uploads may need to be re-uploaded

### Issue 4: File Upload Errors (ERR_INTERNET_DISCONNECTED)

**Symptom**: Browser console shows `ERR_INTERNET_DISCONNECTED` when uploading profile pictures or files.

**Cause**: This is usually a misleading error. Check the API logs to verify if upload actually succeeded.

**Solution**:

```bash
# Check API logs for actual upload status
docker logs plane-plane-api-1 --tail 50 | grep "POST /api/assets"
```

If you see `200` or `204` status codes, the upload succeeded despite the browser error. This is often a timing/race condition issue that doesn't affect functionality.

**Prevention**: Ensure MinIO is healthy before uploading:

```bash
docker ps | grep minio
# Should show "healthy" status
```

### Issue 5: Slow Container Startup

**Symptom**: Containers take a long time to become healthy, especially `plane-api`.

**Cause**: Default healthcheck settings were too conservative (60s start period).

**Solution**: Already fixed in `docker-compose.yaml` with optimized healthcheck:

- `start_period: 20s` (reduced from 60s)
- `interval: 10s` (reduced from 30s)
- `retries: 3` (reduced from 5)

### Issue 6: God-Mode Routing Issues

**Symptom**: Application tries to route to `/god-mode` paths causing 404 errors.

**Cause**: Legacy admin routing configuration.

**Solution**: Already fixed in this repository:

- `VITE_ADMIN_BASE_PATH` set to `""` in `docker-compose.yaml`
- God-mode routing removed from `edge.conf`

### Issue 7: Database Connection Errors

**Symptom**: API container fails to start with database connection errors.

**Solution**:

```bash
# Check database status
docker logs plane-plane-db-1 --tail 20

# Restart database if needed
docker restart plane-plane-db-1

# Wait for healthy status
docker ps | grep plane-db
```

### Issue 8: Port Conflicts

**Symptom**: Docker fails to start with "port already in use" errors.

**Solution**:

```bash
# Check what's using the ports
netstat -ano | findstr :3005
netstat -ano | findstr :3006
netstat -ano | findstr :9000

# Stop conflicting services or change ports in docker-compose.yaml
```

## Useful Commands

### Check Container Status

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs plane-plane-api-1 -f
docker logs plane-plane-web-1 -f
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker restart plane-plane-api-1
```

### Clear Cache

```bash
docker exec plane-plane-api-1 python manage.py clear_cache
```

### Access Database

```bash
docker exec -it plane-plane-db-1 psql -U plane -d plane
```

### Check Instance Configuration

```bash
curl http://localhost:3005/api/instances/ | python -m json.tool
```

## Stopping the Application

To stop the services:

```bash
docker-compose down
```

To stop and remove volumes (WARNING: this deletes all data):

```bash
docker-compose down -v
```

## Backup & Restore

### Full Backup (Recommended)

Use the backup container for comprehensive backups:

```powershell
# Create full backup (DB + uploads + metadata)
docker compose --profile backup run --rm plane-backup /backup.sh

# List available backups
docker compose --profile backup run --rm plane-backup ls -la /backup/output/

# Restore from backup
docker compose --profile backup run --rm plane-backup /restore.sh plane_full_backup_YYYYMMDD_HHMMSS.tar.gz

# Restart after restore
docker compose restart plane-api
docker exec plane-plane-api-1 python manage.py clear_cache
```

**Backup location:** `data/backups/full/`

**Contents:**

- Full PostgreSQL dump
- All entities as JSON (users, projects, issues, modules, cycles, pages)
- MinIO uploads (profile pictures, attachments)

### Quick Database Backup

```bash
docker exec plane-plane-db-1 pg_dump -U plane plane > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i plane-plane-db-1 psql -U plane plane
```

### Backup Files (MinIO)

Files are stored in `./data/minio/` directory. Simply copy this folder to backup uploaded files.

## Production Deployment Notes

For production deployments:

1. **Change default passwords** in `docker-compose.yaml`:
   - Database password
   - MinIO credentials
   - SECRET_KEY

2. **Configure email** for notifications:
   - Set `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`

3. **Set proper domain**:
   - Update `WEB_URL`, `CORS_ALLOWED_ORIGINS` with your domain

4. **Enable HTTPS**:
   - Use a reverse proxy (nginx, Caddy) with SSL certificates
   - Update all URLs to use `https://`

5. **Configure backups**:
   - Set `BACKUP_INTERVAL` environment variable (default: 86400 seconds = 24 hours)
   - Backups are stored in `./data/backups/`

## Bulk Import Guide

### Accessing the Bulk Import UI

1. Login to your workspace at http://localhost:3005
2. On the workspace dashboard, click the **"Bulk import/export"** button in the header
3. The modal provides complete API schema documentation with:
   - Expandable sections for each entity type (Issues, States, Labels, Modules, Cycles)
   - Copy-to-clipboard for endpoints and JSON payloads
   - CSV template download
   - Full schema JSON download
4. **Create New Project**: You can create a new project directly from the modal using the "New" button next to the project selector. This includes options for feature flags (Cycles, Modules, etc.) and auto-generated identifiers.

### Creating an API Token

1. Go to **Settings** → **API Tokens** (or navigate to `/settings/api-tokens/`)
2. Click **Create Token**
3. Give it a name and copy the generated token
4. Use in requests: `Authorization: Bearer <your-token>`

### Step-by-Step Project Import

**Step 1: Get your workspace slug and project ID**

```bash
# List workspaces
curl -H "X-API-Key: <your-api-token>" http://localhost:3005/api/v1/users/me/workspaces/

# List projects in workspace
curl -H "X-API-Key: <your-api-token>" http://localhost:3005/api/v1/workspaces/<slug>/projects/
```

**Step 2: Create States (optional - defaults exist)**

```bash
curl -X POST http://localhost:3005/api/v1/workspaces/<slug>/projects/<project_id>/states/ \
  -H "X-API-Key: <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Code Review",
    "color": "#3B82F6",
    "group": "started"
  }'
```

**Step 3: Create Labels**

```bash
curl -X POST http://localhost:3005/api/v1/workspaces/<slug>/projects/<project_id>/labels/ \
  -H "X-API-Key: <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bug",
    "color": "#EF4444"
  }'
```

**Step 4: Create Issues**

```bash
curl -X POST http://localhost:3005/api/v1/workspaces/<slug>/projects/<project_id>/issues/ \
  -H "X-API-Key: <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Implement user authentication",
    "description_html": "<p>Add OAuth2 login flow</p>",
    "priority": "high",
    "state": "<state-uuid-from-step-2>",
    "labels": ["<label-uuid-from-step-3>"],
    "start_date": "2025-12-29",
    "target_date": "2026-01-15"
  }'
```

### Bulk Import Script Example (PowerShell)

```powershell
$token = "your-api-token"
$baseUrl = "http://localhost:3005"
$workspace = "your-workspace-slug"
$project = "your-project-uuid"

$headers = @{
  "X-API-Key" = $token
  "Content-Type" = "application/json"
}

# Import issues from CSV
$issues = Import-Csv "issues.csv"

foreach ($row in $issues) {
  $body = @{
    name = $row.name
    description_html = "<p>$($row.description)</p>"
    priority = $row.priority
    start_date = $row.start_date
    target_date = $row.target_date
  } | ConvertTo-Json

  try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/workspaces/$workspace/projects/$project/issues/" `
      -Method POST -Headers $headers -Body $body
    Write-Host "Created: $($row.name)" -ForegroundColor Green
  } catch {
    Write-Host "Failed: $($row.name) - $($_.Exception.Message)" -ForegroundColor Red
  }
}
```

### Import Order (Recommended)

To avoid validation errors, import entities in this order:

1. **States** - Custom workflow states
2. **Labels** - Categorization tags
3. **Modules** - Feature groupings
4. **Cycles** - Time-boxed sprints
5. **Issues (parents)** - Parent issues first
6. **Issues (children)** - Child issues with `parent_id`
7. **Links & Comments** - Attachments to issues

### Reference Values

**Priority:** `urgent`, `high`, `medium`, `low`, `none`

**State Groups:** `backlog`, `unstarted`, `started`, `completed`, `cancelled`

**Module Status:** `backlog`, `planned`, `in-progress`, `paused`, `completed`, `cancelled`

See `BULK_IMPORT_FEATURE.md` for complete schema documentation.

## Support

For issues not covered in this guide:

- Check `DEV_FEATURES.md` for custom fork features
- Check `BULK_IMPORT_FEATURE.md` for import/export documentation
- Check the [Plane Documentation](https://docs.plane.so)
- Visit the [GitHub Issues](https://github.com/makeplane/plane/issues)
- Join the [Plane Community](https://discord.com/invite/A92xrEGCge)
