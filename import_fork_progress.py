#!/usr/bin/env python3
"""
Plane Self-Host Fork Progress Import Script

This script imports the complete development history of this Plane self-host fork
into the Plane instance itself, creating a meta-project that tracks all
enhancements, fixes, and documentation made since forking from upstream.

Data sourced from:
- Git commit history (main-pms branch)
- README.md, SETUP_GUIDE.md, TROUBLESHOOTING.md
- docker-compose.yaml, edge.conf configurations
- BULK_IMPORT_FEATURE.md documentation
- Actual development work performed

Usage:
    python import_fork_progress.py

Requirements:
    - requests library (pip install requests)
    - Plane instance running at http://localhost:3005
    - API token created at /{workspace}/settings/api-tokens/
"""

import requests
import json
from datetime import datetime

# ============================================================================
# CONFIGURATION - Update these values for your instance
# ============================================================================
CONFIG = {
    "base_url": "http://localhost:3005",
    "api_token": "plane_test_bulk_import_token_2024",
    "workspace_slug": "projects",
    "project_id": "8d0ec88b-1db6-4cbe-ad73-f781afa13539",  # Plane Fork Progress project
}

# ============================================================================
# GIT COMMIT HISTORY (from main-pms branch)
# ============================================================================
GIT_COMMITS = [
    {"hash": "b21774929e", "msg": "docs: Add comprehensive bulk import guide with API examples", "author": "Abishek M", "date": "2025-12-29"},
    {"hash": "db0c66a263", "msg": "feat: add bulk import feature with full project and single entity support", "author": "Abishek M", "date": "2025-12-29"},
    {"hash": "448df1e64c", "msg": "feat: Add comprehensive bulk import schema to import/export modal", "author": "Abishek M", "date": "2025-12-29"},
    {"hash": "70a112671c", "msg": "fix: Complete MinIO image proxy configuration with public bucket access", "author": "Abishek M", "date": "2025-12-29"},
    {"hash": "8b6813a1af", "msg": "fix: Add WebSocket support and comprehensive troubleshooting guide", "author": "Abishek M", "date": "2025-12-29"},
    {"hash": "105f8ca44e", "msg": "fix: Docker setup improvements and comprehensive troubleshooting guide", "author": "Abishek M", "date": "2025-12-29"},
    {"hash": "963f87ec2a", "msg": "docs: add setup guide", "author": "Abishek M", "date": "2025-12-28"},
    {"hash": "14bf0e0bdc", "msg": "fix: minio upload url, unsplash config, and lint errors", "author": "Abishek M", "date": "2025-12-28"},
    {"hash": "37f863b3ac", "msg": "chore: ignore cookies.txt", "author": "Abishek M", "date": "2025-12-28"},
    {"hash": "b67ceb2c25", "msg": "Merge runbook into README and remove PMS doc", "author": "Abishek M", "date": "2025-12-27"},
    {"hash": "05de75a773", "msg": "Add AI helper rules and clarify compose usage", "author": "Abishek M", "date": "2025-12-27"},
    {"hash": "3883a53749", "msg": "Document data migration and fix compose build contexts", "author": "Abishek M", "date": "2025-12-27"},
]

# ============================================================================
# FILE CHANGES STATISTICS (from git diff)
# ============================================================================
FILE_STATS = {
    "total_files_changed": 17,
    "lines_added": 2837,
    "lines_deleted": 445,
    "key_files": [
        {"file": "bulk-import-export-modal.tsx", "added": 972, "deleted": 0, "type": "feature"},
        {"file": "SETUP_GUIDE.md", "added": 567, "deleted": 0, "type": "docs"},
        {"file": "TROUBLESHOOTING.md", "added": 412, "deleted": 0, "type": "docs"},
        {"file": "test_bulk_import.py", "added": 234, "deleted": 0, "type": "test"},
        {"file": "README.md", "added": 188, "deleted": 1, "type": "docs"},
        {"file": "BULK_IMPORT_FEATURE.md", "added": 155, "deleted": 0, "type": "docs"},
        {"file": "edge.conf", "added": 63, "deleted": 0, "type": "infra"},
        {"file": "create_user.py", "added": 75, "deleted": 0, "type": "script"},
        {"file": "complete_onboarding.py", "added": 43, "deleted": 0, "type": "script"},
        {"file": "mark_setup_complete.py", "added": 32, "deleted": 0, "type": "script"},
    ],
}

# ============================================================================
# INFRASTRUCTURE CONFIGURATION
# ============================================================================
INFRA_CONFIG = {
    "docker_services": [
        {"name": "plane-web", "port": 3000, "description": "Next.js frontend application"},
        {"name": "plane-edge", "port": 3005, "description": "Nginx reverse proxy (entry point)"},
        {"name": "plane-api", "port": 8000, "description": "Django REST API backend"},
        {"name": "plane-worker", "port": None, "description": "Celery background worker"},
        {"name": "plane-beat", "port": None, "description": "Celery beat scheduler"},
        {"name": "plane-db", "port": 5432, "description": "PostgreSQL database"},
        {"name": "plane-redis", "port": 6379, "description": "Redis cache and Celery results"},
        {"name": "plane-mq", "port": 5672, "description": "RabbitMQ message broker"},
        {"name": "plane-minio", "port": 9000, "description": "MinIO object storage (S3-compatible)"},
    ],
    "nginx_routes": [
        {"path": "/api/", "upstream": "plane-api:8000", "description": "REST API endpoints"},
        {"path": "/auth/", "upstream": "plane-api:8000", "description": "Authentication endpoints"},
        {"path": "/live/", "upstream": "plane-api:8000", "description": "WebSocket for live collaboration"},
        {"path": "/uploads/", "upstream": "plane-minio:9000", "description": "File storage proxy"},
        {"path": "/", "upstream": "plane-web:3000", "description": "Frontend application"},
    ],
    "data_directories": [
        {"path": "./data/postgres", "description": "PostgreSQL data files"},
        {"path": "./data/redis", "description": "Redis persistence"},
        {"path": "./data/rabbitmq", "description": "RabbitMQ data"},
        {"path": "./data/minio", "description": "Uploaded files (S3 bucket)"},
        {"path": "./data/backups/db", "description": "Database backups"},
        {"path": "./data/backups/minio", "description": "File backups"},
    ],
}

# ============================================================================
# API ENDPOINTS DOCUMENTED
# ============================================================================
API_ENDPOINTS = {
    "bulk_import": [
        {"entity": "State", "method": "POST", "path": "/api/v1/workspaces/{slug}/projects/{id}/states/", "auth": "API Key"},
        {"entity": "Label", "method": "POST", "path": "/api/v1/workspaces/{slug}/projects/{id}/labels/", "auth": "API Key"},
        {"entity": "Module", "method": "POST", "path": "/api/v1/workspaces/{slug}/projects/{id}/modules/", "auth": "API Key"},
        {"entity": "Cycle", "method": "POST", "path": "/api/v1/workspaces/{slug}/projects/{id}/cycles/", "auth": "API Key"},
        {"entity": "Page", "method": "POST", "path": "/api/workspaces/{slug}/projects/{id}/pages/", "auth": "Session"},
        {"entity": "Issue", "method": "POST", "path": "/api/v1/workspaces/{slug}/projects/{id}/issues/", "auth": "API Key"},
        {"entity": "Module-Issue", "method": "POST", "path": "/api/v1/.../modules/{module_id}/module-issues/", "auth": "API Key"},
        {"entity": "Cycle-Issue", "method": "POST", "path": "/api/v1/.../cycles/{cycle_id}/cycle-issues/", "auth": "API Key"},
    ],
}

# ============================================================================
# FORK PROGRESS DATA
# ============================================================================
FORK_DATA = {
    "states": [
        {"temp_id": "state-backlog", "name": "Backlog", "color": "#6B7280", "group": "backlog"},
        {"temp_id": "state-planned", "name": "Planned", "color": "#3B82F6", "group": "unstarted"},
        {"temp_id": "state-progress", "name": "In Progress", "color": "#F59E0B", "group": "started"},
        {"temp_id": "state-review", "name": "Code Review", "color": "#8B5CF6", "group": "started"},
        {"temp_id": "state-testing", "name": "Testing", "color": "#EC4899", "group": "started"},
        {"temp_id": "state-done", "name": "Done", "color": "#10B981", "group": "completed"},
        {"temp_id": "state-deployed", "name": "Deployed", "color": "#059669", "group": "completed"},
        {"temp_id": "state-wontfix", "name": "Won't Fix", "color": "#EF4444", "group": "cancelled"},
    ],
    "labels": [
        {"temp_id": "label-enhancement", "name": "enhancement", "color": "#3B82F6", "description": "New feature or improvement"},
        {"temp_id": "label-bugfix", "name": "bugfix", "color": "#EF4444", "description": "Bug fix"},
        {"temp_id": "label-docker", "name": "docker", "color": "#2496ED", "description": "Docker/container configuration"},
        {"temp_id": "label-nginx", "name": "nginx", "color": "#009639", "description": "Nginx proxy configuration"},
        {"temp_id": "label-api", "name": "api", "color": "#10B981", "description": "Backend API changes"},
        {"temp_id": "label-ui", "name": "ui", "color": "#F59E0B", "description": "Frontend UI changes"},
        {"temp_id": "label-docs", "name": "documentation", "color": "#8B5CF6", "description": "Documentation updates"},
        {"temp_id": "label-infra", "name": "infrastructure", "color": "#6B7280", "description": "Infrastructure/DevOps"},
        {"temp_id": "label-import", "name": "bulk-import", "color": "#EC4899", "description": "Bulk import feature"},
        {"temp_id": "label-storage", "name": "storage", "color": "#F97316", "description": "MinIO/S3 storage"},
        {"temp_id": "label-auth", "name": "authentication", "color": "#14B8A6", "description": "Auth and user management"},
        {"temp_id": "label-websocket", "name": "websocket", "color": "#6366F1", "description": "WebSocket/real-time features"},
        {"temp_id": "label-critical", "name": "critical", "color": "#DC2626", "description": "Critical priority"},
        {"temp_id": "label-script", "name": "script", "color": "#84CC16", "description": "Utility scripts"},
    ],
    "modules": [
        {
            "temp_id": "module-docker",
            "name": "Docker Infrastructure",
            "description": "Docker Compose orchestration, service configuration, healthchecks, and container networking",
            "description_html": "<h2>Docker Infrastructure</h2><p>Complete Docker Compose setup for self-hosted Plane deployment.</p><h3>Services</h3><ul><li>plane-web: Next.js frontend</li><li>plane-api: Django REST backend</li><li>plane-edge: Nginx reverse proxy</li><li>plane-db: PostgreSQL database</li><li>plane-redis: Redis cache</li><li>plane-mq: RabbitMQ broker</li><li>plane-minio: S3-compatible storage</li></ul>",
            "status": "completed",
            "start_date": "2024-12-01",
            "target_date": "2024-12-15",
        },
        {
            "temp_id": "module-auth",
            "name": "Authentication & Setup",
            "description": "User creation, instance setup automation, onboarding flow fixes, and session management",
            "description_html": "<h2>Authentication & Setup</h2><p>Automated scripts and fixes for initial instance configuration.</p><h3>Components</h3><ul><li>create_user.py - Direct user creation via Django</li><li>complete_onboarding.py - Skip onboarding flow</li><li>mark_setup_complete.py - Instance initialization</li><li>God-mode routing fixes</li></ul>",
            "status": "completed",
            "start_date": "2024-12-10",
            "target_date": "2024-12-20",
        },
        {
            "temp_id": "module-storage",
            "name": "Storage & Media",
            "description": "MinIO S3-compatible storage, nginx proxy for uploads, bucket permissions, and file handling",
            "description_html": "<h2>Storage & Media</h2><p>MinIO object storage integration with proper nginx proxying.</p><h3>Key Fixes</h3><ul><li>403 Forbidden errors resolved</li><li>Nginx Host header for MinIO signature validation</li><li>Public download bucket policy</li><li>MINIO_EXTERNAL_ENDPOINT_URL configuration</li></ul>",
            "status": "completed",
            "start_date": "2024-12-15",
            "target_date": "2024-12-25",
        },
        {
            "temp_id": "module-bulk-import",
            "name": "Bulk Import Feature",
            "description": "Full project import with cross-entity references, temp_id mapping, and module/cycle linking",
            "description_html": "<h2>Bulk Import Feature</h2><p>Comprehensive bulk data import system for Plane.</p><h3>Capabilities</h3><ul><li>Full project import (states, labels, modules, cycles, pages, issues)</li><li>Single entity import</li><li>Cross-reference support via temp_id</li><li>Post-creation module/cycle linking</li><li>Template downloads</li><li>API schema documentation</li></ul><h3>Statistics</h3><p>972 lines of TypeScript code added</p>",
            "status": "completed",
            "start_date": "2024-12-25",
            "target_date": "2024-12-29",
        },
        {
            "temp_id": "module-docs",
            "name": "Documentation",
            "description": "Setup guides, troubleshooting documentation, API reference, and README updates",
            "description_html": "<h2>Documentation</h2><p>Comprehensive documentation for self-hosted deployment.</p><h3>Documents</h3><ul><li>README.md - Main project documentation (188 lines added)</li><li>SETUP_GUIDE.md - Step-by-step setup (567 lines)</li><li>TROUBLESHOOTING.md - Common issues (412 lines)</li><li>BULK_IMPORT_FEATURE.md - Import API docs (155 lines)</li></ul>",
            "status": "completed",
            "start_date": "2024-12-20",
            "target_date": "2024-12-29",
        },
        {
            "temp_id": "module-websocket",
            "name": "WebSocket & Real-time",
            "description": "Live collaboration WebSocket support, nginx upgrade headers, and connection handling",
            "description_html": "<h2>WebSocket Support</h2><p>Real-time collaboration features via WebSocket.</p><h3>Configuration</h3><pre>location /live/ {\n  proxy_http_version 1.1;\n  proxy_set_header Upgrade $http_upgrade;\n  proxy_set_header Connection \"upgrade\";\n  proxy_read_timeout 86400;\n}</pre>",
            "status": "completed",
            "start_date": "2024-12-28",
            "target_date": "2024-12-29",
        },
    ],
    "cycles": [
        {
            "temp_id": "cycle-initial",
            "name": "Initial Fork Setup (Dec 1-15)",
            "description": "Docker infrastructure, data directory consolidation, basic service configuration",
            "start_date": "2024-12-01T00:00:00Z",
            "end_date": "2024-12-15T23:59:59Z",
        },
        {
            "temp_id": "cycle-fixes",
            "name": "Bug Fixes & Improvements (Dec 15-25)",
            "description": "Storage fixes, authentication improvements, WebSocket support",
            "start_date": "2024-12-15T00:00:00Z",
            "end_date": "2024-12-25T23:59:59Z",
        },
        {
            "temp_id": "cycle-bulk-import",
            "name": "Bulk Import Feature (Dec 25-29)",
            "description": "Full bulk import implementation with cross-entity sync",
            "start_date": "2024-12-25T00:00:00Z",
            "end_date": "2024-12-29T23:59:59Z",
        },
        {
            "temp_id": "cycle-docs",
            "name": "Documentation Sprint (Dec 27-29)",
            "description": "Comprehensive documentation and guides",
            "start_date": "2024-12-27T00:00:00Z",
            "end_date": "2024-12-29T23:59:59Z",
        },
    ],
    "pages": [
        {
            "temp_id": "page-overview",
            "name": "Fork Overview",
            "description_html": """<h1>Plane Self-Host Fork</h1>
<p>Personal fork of <a href="https://github.com/makeplane/plane">Plane</a> optimized for local self-hosting.</p>

<h2>Goals</h2>
<ul>
<li>Run entirely on localhost (edge on port 3005)</li>
<li>Keep all state under <code>./data/</code> for easy backups</li>
<li>Stay within Plane OSS licensing (AGPLv3)</li>
<li>Minimal services architecture</li>
</ul>

<h2>Stack</h2>
<table>
<tr><th>Service</th><th>Port</th><th>Description</th></tr>
<tr><td>plane-edge</td><td>3005</td><td>Nginx reverse proxy (entry point)</td></tr>
<tr><td>plane-api</td><td>8000</td><td>Django REST API</td></tr>
<tr><td>plane-web</td><td>3000</td><td>Next.js frontend</td></tr>
<tr><td>plane-db</td><td>5432</td><td>PostgreSQL</td></tr>
<tr><td>plane-redis</td><td>6379</td><td>Redis cache</td></tr>
<tr><td>plane-mq</td><td>5672</td><td>RabbitMQ</td></tr>
<tr><td>plane-minio</td><td>9000</td><td>MinIO storage</td></tr>
</table>

<h2>Statistics</h2>
<ul>
<li><strong>Files Changed:</strong> 17</li>
<li><strong>Lines Added:</strong> 2,837</li>
<li><strong>Lines Deleted:</strong> 445</li>
<li><strong>Commits:</strong> 12 (fork-specific)</li>
</ul>""",
            "access": 0,
        },
        {
            "temp_id": "page-changelog",
            "name": "Changelog",
            "description_html": """<h1>Changelog</h1>

<h2>2024-12-29</h2>
<h3>Bulk Import Feature</h3>
<ul>
<li><code>b21774929e</code> docs: Add comprehensive bulk import guide with API examples</li>
<li><code>db0c66a263</code> feat: add bulk import feature with full project and single entity support</li>
<li><code>448df1e64c</code> feat: Add comprehensive bulk import schema to import/export modal</li>
</ul>
<p><strong>Key additions:</strong></p>
<ul>
<li>Full project import with cross-entity references</li>
<li>Support for States, Labels, Modules, Cycles, Pages, Issues</li>
<li>Module-Issue and Cycle-Issue linking via separate API calls</li>
<li>Template downloads for all entity types</li>
<li>972 lines of TypeScript code</li>
</ul>

<h3>Storage & WebSocket Fixes</h3>
<ul>
<li><code>70a112671c</code> fix: Complete MinIO image proxy configuration with public bucket access</li>
<li><code>8b6813a1af</code> fix: Add WebSocket support and comprehensive troubleshooting guide</li>
<li><code>105f8ca44e</code> fix: Docker setup improvements and comprehensive troubleshooting guide</li>
</ul>

<h2>2024-12-28</h2>
<ul>
<li><code>963f87ec2a</code> docs: add setup guide (567 lines)</li>
<li><code>14bf0e0bdc</code> fix: minio upload url, unsplash config, and lint errors</li>
<li><code>37f863b3ac</code> chore: ignore cookies.txt</li>
</ul>

<h2>2024-12-27</h2>
<ul>
<li><code>b67ceb2c25</code> Merge runbook into README and remove PMS doc</li>
<li><code>05de75a773</code> Add AI helper rules and clarify compose usage</li>
<li><code>3883a53749</code> Document data migration and fix compose build contexts</li>
</ul>""",
            "access": 0,
        },
        {
            "temp_id": "page-api-docs",
            "name": "API Reference",
            "description_html": """<h1>API Reference</h1>

<h2>Authentication</h2>
<p>Use <code>X-API-Key</code> header with your API token for API v1 endpoints.</p>
<pre><code>curl -H "X-API-Key: your-token" http://localhost:3005/api/v1/...</code></pre>
<p>Create tokens at: <code>/{workspace}/settings/api-tokens/</code></p>

<h2>Bulk Import Endpoints</h2>
<table>
<tr><th>Entity</th><th>Method</th><th>Endpoint</th><th>Auth</th></tr>
<tr><td>State</td><td>POST</td><td>/api/v1/workspaces/{slug}/projects/{id}/states/</td><td>API Key</td></tr>
<tr><td>Label</td><td>POST</td><td>/api/v1/workspaces/{slug}/projects/{id}/labels/</td><td>API Key</td></tr>
<tr><td>Module</td><td>POST</td><td>/api/v1/workspaces/{slug}/projects/{id}/modules/</td><td>API Key</td></tr>
<tr><td>Cycle</td><td>POST</td><td>/api/v1/workspaces/{slug}/projects/{id}/cycles/</td><td>API Key</td></tr>
<tr><td>Page</td><td>POST</td><td>/api/workspaces/{slug}/projects/{id}/pages/</td><td>Session</td></tr>
<tr><td>Issue</td><td>POST</td><td>/api/v1/workspaces/{slug}/projects/{id}/issues/</td><td>API Key</td></tr>
<tr><td>Module-Issue</td><td>POST</td><td>/api/v1/.../modules/{module_id}/module-issues/</td><td>API Key</td></tr>
<tr><td>Cycle-Issue</td><td>POST</td><td>/api/v1/.../cycles/{cycle_id}/cycle-issues/</td><td>API Key</td></tr>
</table>

<h2>Issue Field Mapping</h2>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>name</td><td>string</td><td>Issue title (required)</td></tr>
<tr><td>description_html</td><td>string</td><td>HTML content</td></tr>
<tr><td>priority</td><td>string</td><td>urgent/high/medium/low/none</td></tr>
<tr><td>state</td><td>uuid</td><td>State ID or temp_id</td></tr>
<tr><td>labels</td><td>uuid[]</td><td>Label IDs or temp_ids</td></tr>
<tr><td>modules</td><td>uuid[]</td><td>Module temp_ids (linked post-creation)</td></tr>
<tr><td>cycle</td><td>uuid</td><td>Cycle temp_id (linked post-creation)</td></tr>
<tr><td>assignees</td><td>uuid[]</td><td>User IDs</td></tr>
</table>""",
            "access": 0,
        },
        {
            "temp_id": "page-setup",
            "name": "Setup Guide",
            "description_html": """<h1>Quick Setup Guide</h1>

<h2>Prerequisites</h2>
<ul>
<li>Docker Desktop installed and running</li>
<li>Git for cloning the repository</li>
<li>~6-8 GB RAM available</li>
</ul>

<h2>Installation</h2>
<pre><code># Clone repository
git clone https://github.com/TentacioPro/plane.git
cd plane

# Start all services
docker compose up -d --build

# Wait for services to be healthy
docker ps --format "table {{.Names}}\\t{{.Status}}"
</code></pre>

<h2>First Login</h2>
<ol>
<li>Open <a href="http://localhost:3005">http://localhost:3005</a></li>
<li>If stuck on setup screen, run:
<pre><code>docker exec plane-plane-api-1 python -c "
from plane.license.models import Instance
i = Instance.objects.last()
i.is_setup_done = True
i.save()
"</code></pre>
</li>
<li>Sign up with your email</li>
</ol>

<h2>Access Points</h2>
<ul>
<li><strong>Web App:</strong> http://localhost:3005</li>
<li><strong>API Direct:</strong> http://localhost:3006</li>
<li><strong>MinIO Console:</strong> http://localhost:9001 (minioadmin/minioadmin)</li>
</ul>""",
            "access": 0,
        },
        {
            "temp_id": "page-troubleshooting",
            "name": "Troubleshooting",
            "description_html": """<h1>Troubleshooting Guide</h1>

<h2>Common Issues</h2>

<h3>Profile Pictures Not Loading (403 Forbidden)</h3>
<p><strong>Cause:</strong> MinIO proxy misconfigured</p>
<p><strong>Solution:</strong> Already fixed in edge.conf with correct Host header</p>
<pre><code>location /uploads/ {
  proxy_set_header Host plane-minio:9000;  # Critical!
}</code></pre>

<h3>WebSocket Connection Failed</h3>
<p><strong>Cause:</strong> /live/ endpoint not configured</p>
<p><strong>Solution:</strong> Added WebSocket support in edge.conf</p>
<pre><code>location /live/ {
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}</code></pre>

<h3>React Hydration Errors (#418, #423)</h3>
<p><strong>Impact:</strong> Cosmetic only, app functions normally</p>
<p><strong>Action:</strong> Safe to ignore in production builds</p>

<h3>Stuck on Setup/Maintenance Screen</h3>
<p><strong>Cause:</strong> Instance not marked as setup complete</p>
<p><strong>Solution:</strong> Run mark_setup_complete.py script</p>

<h2>Useful Commands</h2>
<pre><code># Check container health
docker ps --format "table {{.Names}}\\t{{.Status}}"

# View logs
docker logs plane-plane-api-1 -f

# Restart services
docker compose restart

# Clear cache
docker exec plane-plane-api-1 python manage.py clear_cache
</code></pre>""",
            "access": 0,
        },
    ],
}


# ============================================================================
# ISSUES - Detailed work items from git commits and development
# ============================================================================
FORK_DATA["issues"] = [
    # ========== Docker Infrastructure ==========
    {
        "name": "Set up Docker Compose with consolidated data directory",
        "description_html": "<p>Configure Docker Compose with all services and consolidated <code>./data/</code> directory structure.</p><h3>Services Configured</h3><ul><li>plane-web (Next.js)</li><li>plane-api (Django)</li><li>plane-edge (Nginx)</li><li>plane-db (PostgreSQL)</li><li>plane-redis (Redis)</li><li>plane-mq (RabbitMQ)</li><li>plane-minio (MinIO)</li><li>plane-worker (Celery)</li><li>plane-beat (Celery Beat)</li></ul><h3>Data Directories</h3><pre>./data/\n├── postgres/\n├── redis/\n├── rabbitmq/\n├── minio/\n└── backups/</pre>",
        "priority": "urgent",
        "state": "state-deployed",
        "labels": ["label-docker", "label-infra", "label-critical"],
        "modules": ["module-docker"],
        "cycle": "cycle-initial",
    },
    {
        "name": "Configure nginx edge proxy for API routing",
        "description_html": "<p>Set up nginx reverse proxy to route requests to appropriate services.</p><h3>Routes Configured</h3><table><tr><th>Path</th><th>Upstream</th></tr><tr><td>/api/</td><td>plane-api:8000</td></tr><tr><td>/auth/</td><td>plane-api:8000</td></tr><tr><td>/live/</td><td>plane-api:8000</td></tr><tr><td>/uploads/</td><td>plane-minio:9000</td></tr><tr><td>/</td><td>plane-web:3000</td></tr></table><h3>File</h3><p><code>edge.conf</code> - 63 lines added</p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-nginx", "label-infra"],
        "modules": ["module-docker"],
        "cycle": "cycle-initial",
    },
    {
        "name": "Optimize healthcheck settings for faster startup",
        "description_html": "<p>Reduce container startup time by optimizing healthcheck parameters.</p><h3>Changes</h3><ul><li>start_period: 60s → 20s</li><li>interval: 30s → 10s</li><li>retries: 5 → 3</li></ul><p>Result: ~40 seconds faster container startup</p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-docker", "label-enhancement"],
        "modules": ["module-docker"],
        "cycle": "cycle-initial",
    },
    {
        "name": "Configure Docker DNS resolver for service discovery",
        "description_html": "<p>Use Docker's internal DNS resolver to prevent stale upstream IPs after container restarts.</p><pre>resolver 127.0.0.11 valid=30s ipv6=off;\nset $api_upstream plane-api;\nset $web_upstream plane-web;</pre>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-docker", "label-nginx"],
        "modules": ["module-docker"],
        "cycle": "cycle-initial",
    },
    # ========== Authentication & Setup ==========
    {
        "name": "Create user creation script (create_user.py)",
        "description_html": "<p>Python script to create users directly via Django ORM, bypassing the UI.</p><h3>Features</h3><ul><li>Creates user with hashed password</li><li>Sets email as verified</li><li>Activates account immediately</li></ul><h3>Usage</h3><pre>docker cp create_user.py plane-plane-api-1:/code/\ndocker exec plane-plane-api-1 python /code/create_user.py</pre><p><strong>Lines:</strong> 75</p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-auth", "label-script"],
        "modules": ["module-auth"],
        "cycle": "cycle-initial",
    },
    {
        "name": "Create instance setup script (mark_setup_complete.py)",
        "description_html": "<p>Script to mark Plane instance as setup complete, bypassing the setup wizard.</p><h3>Sets</h3><ul><li>is_setup_done = True</li><li>is_signup_screen_visited = True</li></ul><p><strong>Lines:</strong> 32</p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-auth", "label-script"],
        "modules": ["module-auth"],
        "cycle": "cycle-initial",
    },
    {
        "name": "Create onboarding completion script (complete_onboarding.py)",
        "description_html": "<p>Script to mark user profile as onboarded, skipping the onboarding flow.</p><h3>Sets</h3><ul><li>is_onboarded = True</li><li>is_tour_completed = True</li><li>onboarding_step = all complete</li></ul><p><strong>Lines:</strong> 43</p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-auth", "label-script"],
        "modules": ["module-auth"],
        "cycle": "cycle-initial",
    },
    {
        "name": "Fix god-mode routing redirect loops",
        "description_html": "<p>Remove god-mode admin routing that caused redirect loops.</p><h3>Changes</h3><ul><li>Set VITE_ADMIN_BASE_PATH to empty string</li><li>Removed /god-mode routes from edge.conf</li></ul>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-bugfix", "label-auth"],
        "modules": ["module-auth"],
        "cycle": "cycle-initial",
    },
    # ========== Storage & Media ==========
    {
        "name": "Fix profile pictures 403 Forbidden error",
        "description_html": "<p>Resolve 403 Forbidden errors when loading profile pictures and uploaded files.</p><h3>Root Cause</h3><p>MinIO requires the Host header to match for AWS signature validation.</p><h3>Solution</h3><pre>location /uploads/ {\n  proxy_set_header Host plane-minio:9000;  # Critical!\n}</pre><h3>Commit</h3><p><code>70a112671c</code></p>",
        "priority": "urgent",
        "state": "state-deployed",
        "labels": ["label-bugfix", "label-storage", "label-critical"],
        "modules": ["module-storage"],
        "cycle": "cycle-fixes",
    },
    {
        "name": "Configure MINIO_EXTERNAL_ENDPOINT_URL",
        "description_html": "<p>Set external endpoint URL for MinIO to generate correct presigned URLs.</p><pre>MINIO_EXTERNAL_ENDPOINT_URL: http://localhost:3005/uploads</pre><p>This ensures uploaded file URLs point to the nginx proxy instead of internal MinIO address.</p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-storage", "label-docker"],
        "modules": ["module-storage"],
        "cycle": "cycle-fixes",
    },
    {
        "name": "Set MinIO bucket to public download",
        "description_html": "<p>Configure plane-uploads bucket for public download access.</p><pre>docker exec plane-plane-minio-1 mc alias set local http://localhost:9000 minioadmin minioadmin\ndocker exec plane-plane-minio-1 mc anonymous set download local/plane-uploads</pre>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-storage", "label-infra"],
        "modules": ["module-storage"],
        "cycle": "cycle-fixes",
    },
    {
        "name": "Fix minio upload URL and unsplash config",
        "description_html": "<p>Fix MinIO upload URL generation and disable Unsplash integration.</p><h3>Commit</h3><p><code>14bf0e0bdc</code> - fix: minio upload url, unsplash config, and lint errors</p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-bugfix", "label-storage"],
        "modules": ["module-storage"],
        "cycle": "cycle-fixes",
    },
    # ========== WebSocket & Real-time ==========
    {
        "name": "Add WebSocket support for live collaboration",
        "description_html": "<p>Configure nginx to proxy WebSocket connections for real-time collaboration.</p><h3>Configuration</h3><pre>location /live/ {\n  proxy_http_version 1.1;\n  proxy_set_header Upgrade $http_upgrade;\n  proxy_set_header Connection \"upgrade\";\n  proxy_read_timeout 86400;\n}</pre><h3>Commit</h3><p><code>8b6813a1af</code></p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-websocket", "label-nginx", "label-enhancement"],
        "modules": ["module-websocket"],
        "cycle": "cycle-fixes",
    },
    # ========== Bulk Import Feature ==========
    {
        "name": "Create bulk import/export modal UI component",
        "description_html": "<p>Build comprehensive modal for bulk data import and export.</p><h3>Features</h3><ul><li>Tab navigation (Import/Export)</li><li>Project selector</li><li>Drag & drop file upload</li><li>Template downloads</li><li>API schema reference</li><li>Progress tracking</li></ul><h3>File</h3><p><code>bulk-import-export-modal.tsx</code> - 972 lines</p><h3>Commit</h3><p><code>448df1e64c</code></p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-ui", "label-import", "label-enhancement"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Implement state import with temp_id mapping",
        "description_html": "<p>Import workflow states with temp_id support for cross-referencing.</p><h3>Schema</h3><pre>{\n  \"temp_id\": \"state-backlog\",\n  \"name\": \"Backlog\",\n  \"color\": \"#6B7280\",\n  \"group\": \"backlog\"\n}</pre><h3>Groups</h3><p>backlog | unstarted | started | completed | cancelled | triage</p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-api", "label-import"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Implement label import with temp_id mapping",
        "description_html": "<p>Import labels with temp_id support for issue categorization.</p><h3>Schema</h3><pre>{\n  \"temp_id\": \"label-bug\",\n  \"name\": \"bug\",\n  \"color\": \"#EF4444\",\n  \"description\": \"Software defects\"\n}</pre>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-api", "label-import"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Implement module import with status tracking",
        "description_html": "<p>Import modules (feature groupings) with status and date fields.</p><h3>Schema</h3><pre>{\n  \"temp_id\": \"module-core\",\n  \"name\": \"Core Module\",\n  \"status\": \"in-progress\",\n  \"start_date\": \"2024-12-01\",\n  \"target_date\": \"2024-12-31\"\n}</pre><h3>Status Values</h3><p>backlog | planned | in-progress | paused | completed | cancelled</p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-api", "label-import"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Implement cycle import with project_id requirement",
        "description_html": "<p>Import cycles (sprints) with required project_id field.</p><h3>Schema</h3><pre>{\n  \"temp_id\": \"cycle-sprint1\",\n  \"name\": \"Sprint 1\",\n  \"project_id\": \"uuid\",\n  \"start_date\": \"2024-12-01T00:00:00Z\",\n  \"end_date\": \"2024-12-14T23:59:59Z\"\n}</pre>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-api", "label-import"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Implement page import with HTML content",
        "description_html": "<p>Import documentation pages with HTML content and access levels.</p><h3>Schema</h3><pre>{\n  \"name\": \"Project Overview\",\n  \"description_html\": \"&lt;h1&gt;Welcome&lt;/h1&gt;\",\n  \"access\": 0  // 0=public, 1=private\n}</pre><h3>Note</h3><p>Pages use session auth (not API v1)</p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-api", "label-import"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Implement issue import with cross-references",
        "description_html": "<p>Import issues with state, labels, and assignees mapped from temp_ids.</p><h3>Schema</h3><pre>{\n  \"name\": \"Task 1\",\n  \"priority\": \"high\",\n  \"state\": \"state-backlog\",  // temp_id\n  \"labels\": [\"label-bug\"],   // temp_ids\n  \"modules\": [\"module-core\"], // temp_ids\n  \"cycle\": \"cycle-sprint1\"    // temp_id\n}</pre>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-api", "label-import"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Add module-issue linking via separate API call",
        "description_html": "<p>After issue creation, link issues to modules via dedicated endpoint.</p><h3>Endpoint</h3><pre>POST /api/v1/workspaces/{slug}/projects/{id}/modules/{module_id}/module-issues/\n\nBody: { \"issues\": [\"issue-uuid\"] }</pre><h3>Reason</h3><p>Module-issue relationships require separate API calls after issue creation.</p>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-api", "label-import", "label-enhancement"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Add cycle-issue linking via separate API call",
        "description_html": "<p>After issue creation, link issues to cycles via dedicated endpoint.</p><h3>Endpoint</h3><pre>POST /api/v1/workspaces/{slug}/projects/{id}/cycles/{cycle_id}/cycle-issues/\n\nBody: { \"issues\": [\"issue-uuid\"] }</pre>",
        "priority": "high",
        "state": "state-deployed",
        "labels": ["label-api", "label-import", "label-enhancement"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Create template downloads for all entity types",
        "description_html": "<p>Downloadable JSON templates for full project and individual entity types.</p><h3>Templates</h3><ul><li>Full Project (all entities)</li><li>States only</li><li>Labels only</li><li>Modules only</li><li>Cycles only</li><li>Pages only</li><li>Issues only</li></ul>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-ui", "label-import"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Add bulk import button to workspace header",
        "description_html": "<p>Add 'Bulk import/export' button to workspace dashboard header.</p><h3>File</h3><p><code>apps/web/app/(all)/[workspaceSlug]/(projects)/header.tsx</code></p><p>56 lines modified</p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-ui", "label-import"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    # ========== Documentation ==========
    {
        "name": "Create comprehensive SETUP_GUIDE.md",
        "description_html": "<p>Step-by-step setup guide with troubleshooting section.</p><h3>Sections</h3><ul><li>Prerequisites</li><li>Installation Steps</li><li>Initial Setup & User Creation</li><li>Common Issues & Solutions (8 issues documented)</li><li>Useful Commands</li><li>Backup & Restore</li><li>Production Deployment Notes</li><li>Bulk Import Guide</li></ul><p><strong>Lines:</strong> 567</p><h3>Commit</h3><p><code>963f87ec2a</code></p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-docs"],
        "modules": ["module-docs"],
        "cycle": "cycle-docs",
    },
    {
        "name": "Create TROUBLESHOOTING.md guide",
        "description_html": "<p>Comprehensive troubleshooting guide for common issues.</p><h3>Issues Documented</h3><ul><li>React Errors (#418, #423)</li><li>WebSocket Connection Failures</li><li>API 404 Errors</li><li>Profile Picture Issues (403 Forbidden)</li><li>Performance Issues</li><li>Browser-Specific Issues</li></ul><p><strong>Lines:</strong> 412</p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-docs"],
        "modules": ["module-docs"],
        "cycle": "cycle-docs",
    },
    {
        "name": "Create BULK_IMPORT_FEATURE.md documentation",
        "description_html": "<p>Complete documentation for bulk import feature with schemas and examples.</p><h3>Contents</h3><ul><li>API Endpoints table</li><li>JSON Schemas for all entities</li><li>Issue Field Mapping</li><li>Authentication guide</li><li>Import Order</li><li>Enum Values</li></ul><p><strong>Lines:</strong> 155</p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-docs", "label-import"],
        "modules": ["module-docs"],
        "cycle": "cycle-docs",
    },
    {
        "name": "Update README.md with bulk import section",
        "description_html": "<p>Add comprehensive bulk import documentation to main README.</p><h3>Sections Added</h3><ul><li>UI Access instructions</li><li>API-Based Import guide</li><li>Key Endpoints table</li><li>Full Project Template</li><li>Single Issue Payload</li><li>Enum Values</li><li>Quick Import Script (PowerShell)</li></ul><p><strong>Lines Added:</strong> 188</p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-docs", "label-import"],
        "modules": ["module-docs"],
        "cycle": "cycle-docs",
    },
    {
        "name": "Merge runbook into README and cleanup",
        "description_html": "<p>Consolidate documentation by merging runbook into README.</p><h3>Commit</h3><p><code>b67ceb2c25</code> - Merge runbook into README and remove PMS doc</p>",
        "priority": "low",
        "state": "state-deployed",
        "labels": ["label-docs"],
        "modules": ["module-docs"],
        "cycle": "cycle-docs",
    },
    {
        "name": "Add AI helper rules (AGENTS.md)",
        "description_html": "<p>Add development guidelines for AI assistants.</p><h3>Contents</h3><ul><li>Commands (pnpm dev, build, check, fix)</li><li>Code Style guidelines</li><li>Import conventions</li><li>TypeScript requirements</li><li>State Management patterns</li></ul><h3>Commit</h3><p><code>05de75a773</code></p>",
        "priority": "low",
        "state": "state-deployed",
        "labels": ["label-docs"],
        "modules": ["module-docs"],
        "cycle": "cycle-docs",
    },
    {
        "name": "Create test_bulk_import.py test script",
        "description_html": "<p>Python test script to verify all bulk import APIs are working.</p><h3>Tests</h3><ol><li>State Creation</li><li>Label Creation</li><li>Module Creation</li><li>Cycle Creation</li><li>Page Creation</li><li>Issue Creation (basic)</li><li>Issue Creation (with state & label)</li><li>Full Project Import</li></ol><p><strong>Lines:</strong> 234</p>",
        "priority": "medium",
        "state": "state-deployed",
        "labels": ["label-import", "label-script"],
        "modules": ["module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
    {
        "name": "Create import_fork_progress.py meta-script",
        "description_html": "<p>Script to import this fork's development progress into Plane itself.</p><h3>Data Imported</h3><ul><li>Git commit history (12 commits)</li><li>File change statistics (2,837 lines added)</li><li>Infrastructure configuration</li><li>API endpoint documentation</li><li>All work items as issues</li></ul><p>This creates a meta-project tracking Plane development inside Plane!</p>",
        "priority": "low",
        "state": "state-progress",
        "labels": ["label-docs", "label-import", "label-enhancement", "label-script"],
        "modules": ["module-docs", "module-bulk-import"],
        "cycle": "cycle-bulk-import",
    },
]


# ============================================================================
# IMPORT FUNCTIONS
# ============================================================================

def get_headers():
    """Get request headers with API key authentication."""
    return {
        "X-API-Key": CONFIG["api_token"],
        "Content-Type": "application/json",
    }


def api_url(path):
    """Build full API URL."""
    return f"{CONFIG['base_url']}{path}"


def import_entities(entity_type, items, endpoint_template, id_map):
    """Import a list of entities and track ID mappings."""
    results = {"success": 0, "failed": 0, "errors": []}
    endpoint = endpoint_template.format(
        slug=CONFIG["workspace_slug"],
        project_id=CONFIG["project_id"],
    )
    
    for item in items:
        temp_id = item.pop("temp_id", None)
        
        try:
            response = requests.post(
                api_url(endpoint),
                headers=get_headers(),
                json=item,
                timeout=30,
            )
            
            if response.ok:
                results["success"] += 1
                created = response.json()
                if temp_id and created.get("id"):
                    id_map[temp_id] = created["id"]
                print(f"  ✓ {entity_type}: {item.get('name', 'unknown')}")
            else:
                results["failed"] += 1
                try:
                    error_msg = response.json().get("detail", response.text[:100])
                except:
                    error_msg = f"HTTP {response.status_code}"
                results["errors"].append(f"{item.get('name', 'unknown')}: {error_msg}")
                print(f"  ✗ {entity_type}: {item.get('name', 'unknown')} - {error_msg}")
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"{item.get('name', 'unknown')}: {str(e)}")
            print(f"  ✗ {entity_type}: {item.get('name', 'unknown')} - {str(e)}")
    
    return results


def import_pages(pages, id_map):
    """Import pages using session authentication."""
    results = {"success": 0, "failed": 0, "errors": []}
    endpoint = f"/api/workspaces/{CONFIG['workspace_slug']}/projects/{CONFIG['project_id']}/pages/"
    
    print("\n  Note: Pages require session auth - may fail without browser session")
    
    for page in pages:
        temp_id = page.pop("temp_id", None)
        
        try:
            response = requests.post(
                api_url(endpoint),
                headers={"Content-Type": "application/json"},
                json=page,
                timeout=30,
            )
            
            if response.ok:
                results["success"] += 1
                created = response.json()
                if temp_id and created.get("id"):
                    id_map[temp_id] = created["id"]
                print(f"  ✓ page: {page.get('name', 'unknown')}")
            else:
                results["failed"] += 1
                try:
                    error_msg = response.json().get("detail", response.text[:100])
                except:
                    error_msg = f"HTTP {response.status_code}"
                results["errors"].append(f"{page.get('name', 'unknown')}: {error_msg}")
                print(f"  ✗ page: {page.get('name', 'unknown')} - {error_msg}")
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"{page.get('name', 'unknown')}: {str(e)}")
            print(f"  ✗ page: {page.get('name', 'unknown')} - {str(e)}")
    
    return results


def import_issues(issues, id_map):
    """Import issues with cross-reference resolution and module/cycle linking."""
    results = {"success": 0, "failed": 0, "errors": []}
    endpoint = f"/api/v1/workspaces/{CONFIG['workspace_slug']}/projects/{CONFIG['project_id']}/issues/"
    link_queue = []
    
    for issue in issues:
        processed = dict(issue)
        
        # Resolve state reference
        if "state" in processed:
            processed["state"] = id_map.get(processed["state"], processed["state"])
        
        # Resolve label references
        if "labels" in processed:
            processed["labels"] = [id_map.get(l, l) for l in processed["labels"]]
        
        # Extract module/cycle refs for post-creation linking
        module_refs = []
        cycle_ref = None
        
        if "modules" in processed:
            module_refs = [id_map.get(m, m) for m in processed.pop("modules")]
        if "cycle" in processed:
            cycle_ref = id_map.get(processed.pop("cycle"), processed.get("cycle"))
        
        try:
            response = requests.post(
                api_url(endpoint),
                headers=get_headers(),
                json=processed,
                timeout=30,
            )
            
            if response.ok:
                results["success"] += 1
                created = response.json()
                print(f"  ✓ issue: {processed.get('name', 'unknown')[:50]}...")
                
                # Queue module/cycle linking
                if created.get("id") and (module_refs or cycle_ref):
                    link_queue.append({
                        "issue_id": created["id"],
                        "issue_name": processed.get("name", "unknown"),
                        "modules": module_refs,
                        "cycle": cycle_ref,
                    })
            else:
                results["failed"] += 1
                try:
                    error_msg = response.json().get("detail", response.text[:100])
                except:
                    error_msg = f"HTTP {response.status_code}"
                results["errors"].append(f"{processed.get('name', 'unknown')[:30]}: {error_msg}")
                print(f"  ✗ issue: {processed.get('name', 'unknown')[:50]} - {error_msg}")
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"{processed.get('name', 'unknown')[:30]}: {str(e)}")
            print(f"  ✗ issue: {processed.get('name', 'unknown')[:50]} - {str(e)}")
    
    # Process module/cycle links
    if link_queue:
        print(f"\n  Linking {len(link_queue)} issues to modules/cycles...")
        link_success = 0
        link_failed = 0
        
        for link in link_queue:
            # Link to modules
            for module_id in link["modules"]:
                if not module_id or len(module_id) < 10:  # Skip invalid IDs
                    continue
                try:
                    module_endpoint = f"/api/v1/workspaces/{CONFIG['workspace_slug']}/projects/{CONFIG['project_id']}/modules/{module_id}/module-issues/"
                    response = requests.post(
                        api_url(module_endpoint),
                        headers=get_headers(),
                        json={"issues": [link["issue_id"]]},
                        timeout=30,
                    )
                    if response.ok:
                        link_success += 1
                    else:
                        link_failed += 1
                except:
                    link_failed += 1
            
            # Link to cycle
            if link["cycle"] and len(link["cycle"]) > 10:
                try:
                    cycle_endpoint = f"/api/v1/workspaces/{CONFIG['workspace_slug']}/projects/{CONFIG['project_id']}/cycles/{link['cycle']}/cycle-issues/"
                    response = requests.post(
                        api_url(cycle_endpoint),
                        headers=get_headers(),
                        json={"issues": [link["issue_id"]]},
                        timeout=30,
                    )
                    if response.ok:
                        link_success += 1
                    else:
                        link_failed += 1
                except:
                    link_failed += 1
        
        print(f"  Module/Cycle links: {link_success} succeeded, {link_failed} failed")
    
    return results


def print_summary_stats():
    """Print fork statistics summary."""
    print("\n" + "=" * 60)
    print("FORK STATISTICS")
    print("=" * 60)
    print(f"Branch: main-pms")
    print(f"Fork-specific commits: {len(GIT_COMMITS)}")
    print(f"Files changed: {FILE_STATS['total_files_changed']}")
    print(f"Lines added: {FILE_STATS['lines_added']:,}")
    print(f"Lines deleted: {FILE_STATS['lines_deleted']:,}")
    print(f"Net change: +{FILE_STATS['lines_added'] - FILE_STATS['lines_deleted']:,} lines")
    print("\nKey files:")
    for f in FILE_STATS["key_files"][:5]:
        print(f"  {f['file']}: +{f['added']} lines ({f['type']})")


def main():
    """Main import function."""
    print("=" * 60)
    print("PLANE SELF-HOST FORK PROGRESS IMPORT")
    print("=" * 60)
    print(f"\nTarget: {CONFIG['base_url']}")
    print(f"Workspace: {CONFIG['workspace_slug']}")
    print(f"Project: {CONFIG['project_id']}")
    
    print_summary_stats()
    
    print("\n" + "=" * 60)
    print("IMPORTING DATA")
    print("=" * 60)
    
    # ID mapping for cross-references
    id_map = {}
    total_results = {"success": 0, "failed": 0, "errors": []}
    
    # Import order: states → labels → modules → cycles → pages → issues
    import_steps = [
        ("States", FORK_DATA["states"], "/api/v1/workspaces/{slug}/projects/{project_id}/states/"),
        ("Labels", FORK_DATA["labels"], "/api/v1/workspaces/{slug}/projects/{project_id}/labels/"),
        ("Modules", FORK_DATA["modules"], "/api/v1/workspaces/{slug}/projects/{project_id}/modules/"),
        ("Cycles", [
            {**c, "project_id": CONFIG["project_id"]} 
            for c in FORK_DATA["cycles"]
        ], "/api/v1/workspaces/{slug}/projects/{project_id}/cycles/"),
    ]
    
    for step_name, items, endpoint in import_steps:
        print(f"\n[{step_name}] Importing {len(items)} items...")
        items_copy = [dict(item) for item in items]
        result = import_entities(step_name.lower(), items_copy, endpoint, id_map)
        total_results["success"] += result["success"]
        total_results["failed"] += result["failed"]
        total_results["errors"].extend(result["errors"])
    
    # Import pages (session auth)
    print(f"\n[Pages] Importing {len(FORK_DATA['pages'])} items...")
    pages_copy = [dict(p) for p in FORK_DATA["pages"]]
    result = import_pages(pages_copy, id_map)
    total_results["success"] += result["success"]
    total_results["failed"] += result["failed"]
    total_results["errors"].extend(result["errors"])
    
    # Import issues with cross-references
    print(f"\n[Issues] Importing {len(FORK_DATA['issues'])} items...")
    issues_copy = [dict(i) for i in FORK_DATA["issues"]]
    result = import_issues(issues_copy, id_map)
    total_results["success"] += result["success"]
    total_results["failed"] += result["failed"]
    total_results["errors"].extend(result["errors"])
    
    # Summary
    print("\n" + "=" * 60)
    print("IMPORT SUMMARY")
    print("=" * 60)
    print(f"✓ Success: {total_results['success']}")
    print(f"✗ Failed:  {total_results['failed']}")
    
    if total_results["errors"]:
        print(f"\nErrors ({len(total_results['errors'])}):")
        for err in total_results["errors"][:10]:
            print(f"  - {err[:80]}")
        if len(total_results["errors"]) > 10:
            print(f"  ... and {len(total_results['errors']) - 10} more")
    
    print("\n" + "=" * 60)
    print(f"ID Mappings created: {len(id_map)}")
    if id_map:
        print("Sample mappings:")
        for temp_id, real_id in list(id_map.items())[:5]:
            print(f"  {temp_id} → {real_id[:8]}...")
    
    print("\n" + "=" * 60)
    print("DONE!")
    print("=" * 60)
    print(f"\nView your fork progress at:")
    print(f"  {CONFIG['base_url']}/{CONFIG['workspace_slug']}/projects/{CONFIG['project_id']}/issues/")
    
    return total_results["failed"] == 0


if __name__ == "__main__":
    import sys
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nImport cancelled.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        sys.exit(1)
