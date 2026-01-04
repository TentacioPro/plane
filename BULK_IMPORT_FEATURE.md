# Bulk Import Feature

Feature to enable bulk data population in Plane via API with complete schema documentation, UI support, and full entity synchronization.

## Status: ✅ Complete (v2 - Session Auth + Work Items)

## Recent Updates (v2.1)

### 1. Idempotent Import

Backend APIs for State, Module, Cycle, and Label creation have been updated to handle duplicates gracefully. If an entity with the same name (and project) already exists, the API returns the existing entity's ID instead of a 400/409 error. This allows imports to be re-run safely without failure.

### 2. Enhanced Import Loader

The import modal now features a real-time progress bar and text transition showing exactly which item is being processed. This provides better feedback during large imports.

### 3. Create Project Flow

Users can now create a new project directly from the Bulk Import modal. A "New" button next to the project selector opens a quick creation form with:

- **Auto-generated Identifier**: Typing the project name automatically generates a 5-character uppercase key.
- **Feature Toggles**: Enable/disable Cycles, Modules, Views, Pages, and Intake during creation.
- **Auto-selection**: The new project is automatically selected upon success.

## Test Results

All API tests passed (8/8):

- ✓ State Creation
- ✓ Label Creation
- ✓ Module Creation
- ✓ Cycle Creation
- ✓ Page Creation
- ✓ Work Item Creation (basic)
- ✓ Work Item Creation (with state & label)
- ✓ Full Project Import (8 entities)

## Full Entity Sync

The bulk import supports complete synchronization across all Plane entities with cross-references:

**Import Flow:**

1. **States** → Created first (workflow foundation)
2. **Labels** → Created second (categorization)
3. **Modules** → Created third (feature groupings)
4. **Cycles** → Created fourth (sprints)
5. **Pages** → Created fifth (documentation)
6. **Work Items** → Created last with references to all above
7. **Post-creation linking** → Module-Issue and Cycle-Issue relationships

**Cross-Reference Support:**

- Use `temp_id` on any entity to reference it before creation
- Work items can reference `state`, `labels[]` directly (resolved during creation)
- Work items can reference `modules[]` and `cycle` (linked via separate POST calls after issue creation)

**Work Items vs Issues:**

- "Work Item" is the UI name, "Issue" is the database model name
- Both `issues` and `work_items` keys are supported in JSON templates
- The API endpoint uses `/issues/` but the UI shows "Work Items"

## Features

### Frontend (Bulk Import Modal)

- **Full Project Import**: Upload single JSON with all entities (states, labels, modules, cycles, pages, work_items)
- **Single Entity Import**: Upload JSON array for specific entity type
- **Template Downloads**: Pre-built templates for both scenarios
- **Auto-detection**: Automatically detects import mode from file structure
- **Progress Tracking**: Shows success/failure counts with full scrollable error log
- **API Schema Reference**: Expandable documentation for each endpoint
- **Cross-reference Support**: Use `temp_id` to reference entities before creation
- **Work Items Alias**: Supports both `issues` and `work_items` keys in JSON

### Backend (Session Auth API)

- RESTful endpoints for all entity types
- Session authentication (browser login required) - uses `/api/` endpoints
- Proper validation and error responses

## API Endpoints

All endpoints use session authentication (browser cookies). Must be logged in to use.

| Entity       | Method | Endpoint                                                     | Auth    |
| ------------ | ------ | ------------------------------------------------------------ | ------- |
| State        | POST   | `/api/workspaces/{slug}/projects/{project_id}/states/`       | Session |
| Label        | POST   | `/api/workspaces/{slug}/projects/{project_id}/issue-labels/` | Session |
| Module       | POST   | `/api/workspaces/{slug}/projects/{project_id}/modules/`      | Session |
| Cycle        | POST   | `/api/workspaces/{slug}/projects/{project_id}/cycles/`       | Session |
| Page         | POST   | `/api/workspaces/{slug}/projects/{project_id}/pages/`        | Session |
| Work Item    | POST   | `/api/workspaces/{slug}/projects/{project_id}/issues/`       | Session |
| Module-Issue | POST   | `/api/.../modules/{module_id}/issues/`                       | Session |
| Cycle-Issue  | POST   | `/api/.../cycles/{cycle_id}/cycle-issues/`                   | Session |

**Note:** API v1 endpoints (`/api/v1/...`) require `X-API-Key` header authentication. The bulk import modal uses session auth for simplicity.

## JSON Schemas

### Full Project Template (with cross-references)

```json
{
  "_info": {
    "description": "Full project import template with cross-references",
    "import_order": "states → labels → modules → cycles → pages → issues",
    "temp_id_usage": "Use temp_id to reference entities before they're created",
    "module_cycle_linking": "Issues can reference 'modules' (array) and 'cycle' (string) - linked via separate API calls"
  },
  "states": [
    { "temp_id": "state-backlog", "name": "Backlog", "color": "#6B7280", "group": "backlog" },
    { "temp_id": "state-done", "name": "Done", "color": "#10B981", "group": "completed" }
  ],
  "labels": [{ "temp_id": "label-bug", "name": "bug", "color": "#EF4444", "description": "Software defects" }],
  "modules": [{ "temp_id": "module-core", "name": "Core Module", "status": "planned" }],
  "cycles": [
    {
      "temp_id": "cycle-sprint1",
      "name": "Sprint 1",
      "start_date": "2025-01-01T00:00:00Z",
      "end_date": "2025-01-14T00:00:00Z"
    }
  ],
  "pages": [
    {
      "name": "Project Overview",
      "description_html": "<h1>Welcome</h1><p>Project documentation</p>",
      "access": 0
    }
  ],
  "issues": [
    {
      "name": "Task 1",
      "priority": "high",
      "description_html": "<p>Description</p>",
      "state": "state-backlog",
      "labels": ["label-bug"],
      "modules": ["module-core"],
      "cycle": "cycle-sprint1",
      "assignees": []
    }
  ]
}
```

### Single Entity Templates

#### State

```json
[
  { "name": "Backlog", "color": "#6B7280", "group": "backlog" },
  { "name": "Code Review", "color": "#3B82F6", "group": "started" }
]
```

#### Label

```json
[
  { "name": "bug", "color": "#EF4444", "description": "Software defects" },
  { "name": "feature", "color": "#3B82F6", "description": "New features" }
]
```

#### Module

```json
[{ "name": "Auth Module", "status": "in-progress", "start_date": "2025-01-01", "target_date": "2025-02-01" }]
```

#### Cycle

```json
[
  {
    "name": "Sprint 1",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-01-14T00:00:00Z"
  }
]
```

#### Page

```json
[
  {
    "name": "Project Overview",
    "description_html": "<h1>Welcome</h1><p>Documentation page content in HTML.</p>",
    "access": 0
  }
]
```

#### Issue

```json
[
  {
    "name": "Implement login",
    "priority": "high",
    "description_html": "<p>Add OAuth2 login flow</p>",
    "assignees": [],
    "labels": []
  }
]
```

## Issue Field Mapping

The API uses these field names for issues:

| Field            | Type   | Description                            |
| ---------------- | ------ | -------------------------------------- |
| name             | string | Issue title (required)                 |
| description_html | string | HTML content                           |
| priority         | string | urgent/high/medium/low/none            |
| state            | uuid   | State ID or temp_id reference          |
| labels           | uuid[] | Label IDs or temp_id refs              |
| modules          | uuid[] | Module temp_ids (linked post-creation) |
| cycle            | uuid   | Cycle temp_id (linked post-creation)   |
| assignees        | uuid[] | User IDs                               |
| parent           | uuid   | Parent issue ID                        |
| start_date       | date   | YYYY-MM-DD                             |
| target_date      | date   | YYYY-MM-DD                             |

**Note**: Module and Cycle linking requires separate API calls after issue creation. The import handles this automatically.

## Authentication

### API Key (for API v1 endpoints)

```bash
curl -X POST "http://localhost:3005/api/v1/workspaces/{slug}/projects/{project_id}/states/" \
  -H "X-API-Key: <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Review", "color": "#3B82F6", "group": "started"}'
```

Create API tokens at: `/{workspace}/settings/api-tokens/`

### Session Auth (for Pages)

Pages require browser session authentication. The bulk import modal handles this automatically when you're logged in.

## Import Order

Import entities in this order to avoid validation errors:

1. States (required for issue workflow)
2. Labels (required for categorization)
3. Modules (feature groupings)
4. Cycles (time-boxed iterations)
5. Pages (documentation)
6. Issues (work items - can reference all above)

## Enum Values

### Priority

`urgent` | `high` | `medium` | `low` | `none`

### State Group

`backlog` | `unstarted` | `started` | `completed` | `cancelled` | `triage`

### Module Status

`backlog` | `planned` | `in-progress` | `paused` | `completed` | `cancelled`

### Page Access

`0` = Public | `1` = Private

## Files Modified

- `apps/web/core/components/import-export/bulk-import-export-modal.tsx` - Main UI component
- `apps/web/app/(all)/[workspaceSlug]/(projects)/header.tsx` - Modal trigger button
- `README.md` - Documentation
- `SETUP_GUIDE.md` - Setup instructions

## Test Script

Run `python test_bulk_import.py` to verify all APIs are working.
