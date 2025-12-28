#!/usr/bin/env python3
"""
Direct database import for fork progress - bypasses API rate limits.
Run inside Docker: docker exec plane-plane-api-1 python /code/import_fork_direct.py
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.production')
sys.path.insert(0, '/code')
django.setup()

from django.utils import timezone
from plane.db.models import (
    Project, Workspace, User, State, Label, Module, Cycle, Page, Issue,
    IssueLabel, ModuleIssue, CycleIssue
)
import uuid

# Configuration
PROJECT_ID = 'a852b5ee-16c4-4ef7-b73d-d6ad793803a8'
WORKSPACE_SLUG = 'projects'
USER_EMAIL = 'maharajanabishek@gmail.com'

print("=" * 60)
print("DIRECT DATABASE IMPORT - Fork Progress")
print("=" * 60)

# Get references
project = Project.objects.get(id=PROJECT_ID)
workspace = Workspace.objects.get(slug=WORKSPACE_SLUG)
user = User.objects.get(email=USER_EMAIL)

print(f"Project: {project.name}")
print(f"Workspace: {workspace.name}")
print(f"User: {user.email}")

# ID mappings
id_map = {}

# ============================================================================
# STATES
# ============================================================================
print("\n[States] Creating...")
states_data = [
    {"name": "Backlog", "color": "#6B7280", "group": "backlog", "sequence": 1},
    {"name": "Planned", "color": "#3B82F6", "group": "unstarted", "sequence": 2},
    {"name": "In Progress", "color": "#F59E0B", "group": "started", "sequence": 3},
    {"name": "Code Review", "color": "#8B5CF6", "group": "started", "sequence": 4},
    {"name": "Testing", "color": "#EC4899", "group": "started", "sequence": 5},
    {"name": "Done", "color": "#10B981", "group": "completed", "sequence": 6},
    {"name": "Deployed", "color": "#059669", "group": "completed", "sequence": 7},
    {"name": "Won't Fix", "color": "#EF4444", "group": "cancelled", "sequence": 8},
]

for s in states_data:
    state, created = State.objects.get_or_create(
        project=project,
        name=s["name"],
        defaults={
            "color": s["color"],
            "group": s["group"],
            "sequence": s["sequence"] * 1000,
            "workspace": workspace,
            "created_by": user,
        }
    )
    id_map[f"state-{s['name'].lower().replace(' ', '-')}"] = state.id
    print(f"  {'✓' if created else '○'} {s['name']}")

# ============================================================================
# LABELS
# ============================================================================
print("\n[Labels] Creating...")
labels_data = [
    {"name": "enhancement", "color": "#3B82F6", "description": "New feature or improvement"},
    {"name": "bugfix", "color": "#EF4444", "description": "Bug fix"},
    {"name": "docker", "color": "#2496ED", "description": "Docker/container configuration"},
    {"name": "nginx", "color": "#009639", "description": "Nginx proxy configuration"},
    {"name": "api", "color": "#10B981", "description": "Backend API changes"},
    {"name": "ui", "color": "#F59E0B", "description": "Frontend UI changes"},
    {"name": "documentation", "color": "#8B5CF6", "description": "Documentation updates"},
    {"name": "infrastructure", "color": "#6B7280", "description": "Infrastructure/DevOps"},
    {"name": "bulk-import", "color": "#EC4899", "description": "Bulk import feature"},
    {"name": "storage", "color": "#F97316", "description": "MinIO/S3 storage"},
    {"name": "authentication", "color": "#14B8A6", "description": "Auth and user management"},
    {"name": "websocket", "color": "#6366F1", "description": "WebSocket/real-time features"},
    {"name": "critical", "color": "#DC2626", "description": "Critical priority"},
    {"name": "script", "color": "#84CC16", "description": "Utility scripts"},
]

for l in labels_data:
    label, created = Label.objects.get_or_create(
        project=project,
        name=l["name"],
        defaults={
            "color": l["color"],
            "description": l.get("description", ""),
            "workspace": workspace,
            "created_by": user,
        }
    )
    id_map[f"label-{l['name']}"] = label.id
    print(f"  {'✓' if created else '○'} {l['name']}")

# ============================================================================
# MODULES
# ============================================================================
print("\n[Modules] Creating...")
modules_data = [
    {"name": "Docker Infrastructure", "description": "Docker Compose orchestration, service configuration, healthchecks", "status": "completed"},
    {"name": "Authentication & Setup", "description": "User creation, instance setup automation, onboarding flow fixes", "status": "completed"},
    {"name": "Storage & Media", "description": "MinIO S3-compatible storage, nginx proxy for uploads, bucket permissions", "status": "completed"},
    {"name": "Bulk Import Feature", "description": "Full project import with cross-entity references, temp_id mapping", "status": "completed"},
    {"name": "Documentation", "description": "Setup guides, troubleshooting documentation, API reference", "status": "completed"},
    {"name": "WebSocket & Real-time", "description": "Live collaboration WebSocket support, nginx upgrade headers", "status": "completed"},
]

for m in modules_data:
    module, created = Module.objects.get_or_create(
        project=project,
        name=m["name"],
        defaults={
            "description": m["description"],
            "status": m["status"],
            "workspace": workspace,
            "created_by": user,
        }
    )
    id_map[f"module-{m['name'].lower().replace(' ', '-').replace('&', '')}"] = module.id
    print(f"  {'✓' if created else '○'} {m['name']}")

# ============================================================================
# CYCLES
# ============================================================================
print("\n[Cycles] Creating...")
from datetime import datetime, timedelta

cycles_data = [
    {"name": "Initial Fork Setup (Dec 1-15)", "description": "Docker infrastructure, data directory consolidation", "start": -28, "end": -14},
    {"name": "Bug Fixes & Improvements (Dec 15-25)", "description": "Storage fixes, authentication improvements", "start": -14, "end": -4},
    {"name": "Bulk Import Feature (Dec 25-29)", "description": "Full bulk import implementation", "start": -4, "end": 0},
    {"name": "Documentation Sprint (Dec 27-29)", "description": "Comprehensive documentation and guides", "start": -2, "end": 0},
]

now = timezone.now()
for c in cycles_data:
    cycle, created = Cycle.objects.get_or_create(
        project=project,
        name=c["name"],
        defaults={
            "description": c["description"],
            "start_date": now + timedelta(days=c["start"]),
            "end_date": now + timedelta(days=c["end"]),
            "workspace": workspace,
            "created_by": user,
            "owned_by": user,
        }
    )
    id_map[f"cycle-{c['name'].split('(')[0].strip().lower().replace(' ', '-')}"] = cycle.id
    print(f"  {'✓' if created else '○'} {c['name']}")

# ============================================================================
# PAGES
# ============================================================================
print("\n[Pages] Creating...")
pages_data = [
    {"name": "Fork Overview", "content": "<h1>Plane Self-Host Fork</h1><p>Personal fork optimized for local self-hosting.</p><h2>Goals</h2><ul><li>Run entirely on localhost (port 3005)</li><li>Keep all state under ./data/</li><li>Stay within Plane OSS licensing</li></ul>"},
    {"name": "Changelog", "content": "<h1>Changelog</h1><h2>2024-12-29</h2><ul><li>Bulk Import Feature complete</li><li>Module/Cycle linking</li><li>Template downloads</li></ul><h2>2024-12-28</h2><ul><li>Setup guide added</li><li>MinIO fixes</li></ul>"},
    {"name": "API Reference", "content": "<h1>API Reference</h1><p>Use X-API-Key header for authentication.</p><h2>Endpoints</h2><ul><li>POST /api/v1/.../states/</li><li>POST /api/v1/.../labels/</li><li>POST /api/v1/.../modules/</li><li>POST /api/v1/.../cycles/</li><li>POST /api/v1/.../issues/</li></ul>"},
    {"name": "Setup Guide", "content": "<h1>Quick Setup</h1><pre>git clone https://github.com/TentacioPro/plane.git\ncd plane\ndocker compose up -d --build</pre><p>Access at http://localhost:3005</p>"},
    {"name": "Troubleshooting", "content": "<h1>Troubleshooting</h1><h2>403 on Images</h2><p>Fixed in edge.conf with correct Host header for MinIO.</p><h2>WebSocket Errors</h2><p>Fixed with /live/ proxy configuration.</p>"},
]

# Pages use ProjectPage junction table
from plane.db.models import ProjectPage

for p in pages_data:
    # Check if page exists by name in workspace
    existing = Page.objects.filter(workspace=workspace, name=p["name"]).first()
    if existing:
        print(f"  ○ {p['name']}")
        continue
    
    page = Page.objects.create(
        name=p["name"],
        description_html=p["content"],
        workspace=workspace,
        created_by=user,
        owned_by=user,
        access=0,
    )
    # Link to project
    ProjectPage.objects.create(
        project=project,
        page=page,
        workspace=workspace,
        created_by=user,
    )
    print(f"  ✓ {p['name']}")

# ============================================================================
# ISSUES
# ============================================================================
print("\n[Issues] Creating...")

# Get default state
default_state = State.objects.filter(project=project, group="completed").first()

issues_data = [
    # Docker Infrastructure
    {"name": "Set up Docker Compose with consolidated data directory", "priority": "urgent", "state": "deployed", "labels": ["docker", "infrastructure", "critical"], "module": "docker-infrastructure"},
    {"name": "Configure nginx edge proxy for API routing", "priority": "high", "state": "deployed", "labels": ["nginx", "infrastructure"], "module": "docker-infrastructure"},
    {"name": "Optimize healthcheck settings for faster startup", "priority": "medium", "state": "deployed", "labels": ["docker", "enhancement"], "module": "docker-infrastructure"},
    {"name": "Configure Docker DNS resolver for service discovery", "priority": "medium", "state": "deployed", "labels": ["docker", "nginx"], "module": "docker-infrastructure"},
    # Auth & Setup
    {"name": "Create user creation script (create_user.py)", "priority": "high", "state": "deployed", "labels": ["authentication", "script"], "module": "authentication--setup"},
    {"name": "Create instance setup script (mark_setup_complete.py)", "priority": "high", "state": "deployed", "labels": ["authentication", "script"], "module": "authentication--setup"},
    {"name": "Create onboarding completion script", "priority": "medium", "state": "deployed", "labels": ["authentication", "script"], "module": "authentication--setup"},
    {"name": "Fix god-mode routing redirect loops", "priority": "medium", "state": "deployed", "labels": ["bugfix", "authentication"], "module": "authentication--setup"},
    # Storage
    {"name": "Fix profile pictures 403 Forbidden error", "priority": "urgent", "state": "deployed", "labels": ["bugfix", "storage", "critical"], "module": "storage--media"},
    {"name": "Configure MINIO_EXTERNAL_ENDPOINT_URL", "priority": "high", "state": "deployed", "labels": ["storage", "docker"], "module": "storage--media"},
    {"name": "Set MinIO bucket to public download", "priority": "high", "state": "deployed", "labels": ["storage", "infrastructure"], "module": "storage--media"},
    {"name": "Fix minio upload URL and unsplash config", "priority": "medium", "state": "deployed", "labels": ["bugfix", "storage"], "module": "storage--media"},
    # WebSocket
    {"name": "Add WebSocket support for live collaboration", "priority": "high", "state": "deployed", "labels": ["websocket", "nginx", "enhancement"], "module": "websocket--real-time"},
    # Bulk Import
    {"name": "Create bulk import/export modal UI component", "priority": "high", "state": "deployed", "labels": ["ui", "bulk-import", "enhancement"], "module": "bulk-import-feature"},
    {"name": "Implement state import with temp_id mapping", "priority": "high", "state": "deployed", "labels": ["api", "bulk-import"], "module": "bulk-import-feature"},
    {"name": "Implement label import with temp_id mapping", "priority": "high", "state": "deployed", "labels": ["api", "bulk-import"], "module": "bulk-import-feature"},
    {"name": "Implement module import with status tracking", "priority": "high", "state": "deployed", "labels": ["api", "bulk-import"], "module": "bulk-import-feature"},
    {"name": "Implement cycle import with project_id requirement", "priority": "high", "state": "deployed", "labels": ["api", "bulk-import"], "module": "bulk-import-feature"},
    {"name": "Implement page import with HTML content", "priority": "high", "state": "deployed", "labels": ["api", "bulk-import"], "module": "bulk-import-feature"},
    {"name": "Implement issue import with cross-references", "priority": "high", "state": "deployed", "labels": ["api", "bulk-import"], "module": "bulk-import-feature"},
    {"name": "Add module-issue linking via separate API call", "priority": "high", "state": "deployed", "labels": ["api", "bulk-import", "enhancement"], "module": "bulk-import-feature"},
    {"name": "Add cycle-issue linking via separate API call", "priority": "high", "state": "deployed", "labels": ["api", "bulk-import", "enhancement"], "module": "bulk-import-feature"},
    {"name": "Create template downloads for all entity types", "priority": "medium", "state": "deployed", "labels": ["ui", "bulk-import"], "module": "bulk-import-feature"},
    {"name": "Add bulk import button to workspace header", "priority": "medium", "state": "deployed", "labels": ["ui", "bulk-import"], "module": "bulk-import-feature"},
    # Documentation
    {"name": "Create comprehensive SETUP_GUIDE.md", "priority": "medium", "state": "deployed", "labels": ["documentation"], "module": "documentation"},
    {"name": "Create TROUBLESHOOTING.md guide", "priority": "medium", "state": "deployed", "labels": ["documentation"], "module": "documentation"},
    {"name": "Create BULK_IMPORT_FEATURE.md documentation", "priority": "medium", "state": "deployed", "labels": ["documentation", "bulk-import"], "module": "documentation"},
    {"name": "Update README.md with bulk import section", "priority": "medium", "state": "deployed", "labels": ["documentation", "bulk-import"], "module": "documentation"},
    {"name": "Merge runbook into README and cleanup", "priority": "low", "state": "deployed", "labels": ["documentation"], "module": "documentation"},
    {"name": "Add AI helper rules (AGENTS.md)", "priority": "low", "state": "deployed", "labels": ["documentation"], "module": "documentation"},
    {"name": "Create test_bulk_import.py test script", "priority": "medium", "state": "deployed", "labels": ["bulk-import", "script"], "module": "bulk-import-feature"},
    {"name": "Create import_fork_progress.py meta-script", "priority": "low", "state": "in-progress", "labels": ["documentation", "bulk-import", "enhancement", "script"], "module": "documentation"},
]

state_map = {
    "backlog": id_map.get("state-backlog"),
    "planned": id_map.get("state-planned"),
    "in-progress": id_map.get("state-in-progress"),
    "review": id_map.get("state-code-review"),
    "testing": id_map.get("state-testing"),
    "done": id_map.get("state-done"),
    "deployed": id_map.get("state-deployed"),
    "wontfix": id_map.get("state-won't-fix"),
}

created_count = 0
for i in issues_data:
    state_id = state_map.get(i["state"], default_state.id if default_state else None)
    
    issue, created = Issue.objects.get_or_create(
        project=project,
        name=i["name"],
        defaults={
            "priority": i["priority"],
            "state_id": state_id,
            "workspace": workspace,
            "created_by": user,
        }
    )
    
    if created:
        created_count += 1
        # Add labels
        for label_name in i.get("labels", []):
            label_id = id_map.get(f"label-{label_name}")
            if label_id:
                IssueLabel.objects.get_or_create(
                    issue=issue,
                    label_id=label_id,
                    defaults={"workspace": workspace, "project": project, "created_by": user}
                )
        
        # Add to module
        module_key = f"module-{i.get('module', '')}"
        module_id = id_map.get(module_key)
        if module_id:
            ModuleIssue.objects.get_or_create(
                issue=issue,
                module_id=module_id,
                defaults={"workspace": workspace, "project": project, "created_by": user}
            )
    
    print(f"  {'✓' if created else '○'} {i['name'][:50]}...")

print(f"\n  Created {created_count} new issues")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 60)
print("IMPORT COMPLETE")
print("=" * 60)
print(f"States: {State.objects.filter(project=project).count()}")
print(f"Labels: {Label.objects.filter(project=project).count()}")
print(f"Modules: {Module.objects.filter(project=project).count()}")
print(f"Cycles: {Cycle.objects.filter(project=project).count()}")
print(f"Pages: {Page.objects.filter(project=project).count()}")
print(f"Issues: {Issue.objects.filter(project=project).count()}")
print("\nView at: http://localhost:3005/projects/projects/{}/issues/".format(PROJECT_ID))
