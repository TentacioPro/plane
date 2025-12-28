# Bulk Import Feature

Feature to enable bulk data population in Plane via API with complete schema documentation and UI support.

## Status: ✅ Complete

## Test Results

All API tests passed (7/7):

- ✓ State Creation
- ✓ Label Creation
- ✓ Module Creation
- ✓ Cycle Creation
- ✓ Issue Creation (basic)
- ✓ Issue Creation (with state & label)
- ✓ Full Project Import (8 entities)

## Features

### Frontend (Bulk Import Modal)

- **Full Project Import**: Upload single JSON with all entities (states, labels, modules, cycles, issues)
- **Single Entity Import**: Upload JSON array for specific entity type
- **Template Downloads**: Pre-built templates for both scenarios
- **Auto-detection**: Automatically detects import mode from file structure
- **Progress Tracking**: Shows success/failure counts with error details
- **API Schema Reference**: Expandable documentation for each endpoint

### Backend (API v1)

- RESTful endpoints for all entity types
- API Key authentication via `X-API-Key` header
- Proper validation and error responses

## API Endpoints

| Entity | Method | Endpoint                                                   |
| ------ | ------ | ---------------------------------------------------------- |
| State  | POST   | `/api/v1/workspaces/{slug}/projects/{project_id}/states/`  |
| Label  | POST   | `/api/v1/workspaces/{slug}/projects/{project_id}/labels/`  |
| Module | POST   | `/api/v1/workspaces/{slug}/projects/{project_id}/modules/` |
| Cycle  | POST   | `/api/v1/workspaces/{slug}/projects/{project_id}/cycles/`  |
| Issue  | POST   | `/api/v1/workspaces/{slug}/projects/{project_id}/issues/`  |

## JSON Schemas

### Full Project Template

```json
{
  "states": [
    { "name": "Backlog", "color": "#6B7280", "group": "backlog" },
    { "name": "Done", "color": "#10B981", "group": "completed" }
  ],
  "labels": [{ "name": "bug", "color": "#EF4444", "description": "Software defects" }],
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

### Single Entity Templates

#### State

```json
[{ "name": "Code Review", "color": "#3B82F6", "group": "started" }]
```

#### Label

```json
[{ "name": "feature", "color": "#3B82F6", "description": "New features" }]
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
    "end_date": "2025-01-14T00:00:00Z",
    "project_id": "<project-uuid>"
  }
]
```

#### Issue

```json
[{ "name": "Implement login", "priority": "high", "description_html": "<p>Add OAuth2</p>" }]
```

## Authentication

API requests require `X-API-Key` header:

```bash
curl -X POST "http://localhost:3005/api/v1/workspaces/{slug}/projects/{project_id}/states/" \
  -H "X-API-Key: <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Review", "color": "#3B82F6", "group": "started"}'
```

Create API tokens at: `/{workspace}/settings/api-tokens/`

## Import Order

Import entities in this order to avoid validation errors:

1. States (required for issue workflow)
2. Labels (required for categorization)
3. Modules (feature groupings)
4. Cycles (time-boxed iterations)
5. Issues (work items)

## Enum Values

### Priority

`urgent` | `high` | `medium` | `low` | `none`

### State Group

`backlog` | `unstarted` | `started` | `completed` | `cancelled`

### Module Status

`backlog` | `planned` | `in-progress` | `paused` | `completed` | `cancelled`

## Files Modified

- `apps/web/core/components/import-export/bulk-import-export-modal.tsx` - Main UI component
- `apps/web/app/(all)/[workspaceSlug]/(projects)/header.tsx` - Modal trigger button
- `README.md` - Documentation
- `SETUP_GUIDE.md` - Setup instructions

## Test Script

Run `python test_bulk_import.py` to verify all APIs are working.
