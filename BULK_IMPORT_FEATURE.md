# Bulk Import Feature

Feature to enable bulk data population in Plane via API with complete schema documentation.

## Status: In Progress

## Progress

- [x] Analyzed backend schema (models, serializers, views)
- [x] Documented complete JSON structure for all entities
- [x] Updated bulk-import-export-modal.tsx with complete schema
- [x] Local build successful (pnpm turbo run build --filter=web)
- [x] Docker build successful (docker compose build plane-web)
- [x] Containers restarted (plane-web, plane-edge)

## Complete Schema Reference

### Entity Hierarchy

```
Workspace
├── Project
│   ├── State (workflow states)
│   ├── Label (project-level labels)
│   ├── Module (feature grouping)
│   ├── Cycle (time-boxed iterations)
│   ├── Estimate (point system)
│   ├── IssueType (work item types)
│   └── Issue (work items)
│       ├── IssueAssignee
│       ├── IssueLabel
│       ├── IssueLink
│       ├── IssueComment
│       ├── IssueRelation
│       └── IssueAttachment
└── WorkspaceMember
```

### API Endpoints

| Entity        | Method | Endpoint                                                                   |
| ------------- | ------ | -------------------------------------------------------------------------- |
| Issue         | POST   | `/api/workspaces/{slug}/projects/{project_id}/issues/`                     |
| State         | POST   | `/api/workspaces/{slug}/projects/{project_id}/states/`                     |
| Label         | POST   | `/api/workspaces/{slug}/projects/{project_id}/labels/`                     |
| Module        | POST   | `/api/workspaces/{slug}/projects/{project_id}/modules/`                    |
| Cycle         | POST   | `/api/workspaces/{slug}/projects/{project_id}/cycles/`                     |
| Issue Link    | POST   | `/api/workspaces/{slug}/projects/{project_id}/issues/{issue_id}/links/`    |
| Issue Comment | POST   | `/api/workspaces/{slug}/projects/{project_id}/issues/{issue_id}/comments/` |
| Module Issue  | POST   | `/api/workspaces/{slug}/projects/{project_id}/modules/{module_id}/issues/` |
| Cycle Issue   | POST   | `/api/workspaces/{slug}/projects/{project_id}/cycles/{cycle_id}/issues/`   |

### JSON Schemas

#### Issue (IssueCreateSerializer)

```json
{
  "name": "string (required, max 255)",
  "description_html": "string (HTML content)",
  "priority": "urgent|high|medium|low|none (default: none)",
  "state_id": "uuid (optional, defaults to project default state)",
  "parent_id": "uuid (optional, must be in same project)",
  "assignee_ids": ["uuid"],
  "label_ids": ["uuid"],
  "start_date": "YYYY-MM-DD (optional)",
  "target_date": "YYYY-MM-DD (optional)",
  "estimate_point": "uuid (optional, EstimatePoint id)",
  "type_id": "uuid (optional, IssueType id)"
}
```

#### State

```json
{
  "name": "string (required, max 255)",
  "description": "string (optional)",
  "color": "string (hex color, e.g. #60646C)",
  "group": "backlog|unstarted|started|completed|cancelled|triage",
  "sequence": "float (optional, auto-calculated)",
  "default": "boolean (optional)"
}
```

Default states created per project:

- Backlog (#60646C, group: backlog, default: true)
- Todo (#60646C, group: unstarted)
- In Progress (#F59E0B, group: started)
- Done (#46A758, group: completed)
- Cancelled (#9AA4BC, group: cancelled)

#### Label

```json
{
  "name": "string (required, max 255)",
  "description": "string (optional)",
  "color": "string (hex color)",
  "parent": "uuid (optional, parent label id)"
}
```

#### Module

```json
{
  "name": "string (required, max 255)",
  "description": "string (optional)",
  "description_html": "string (optional)",
  "start_date": "YYYY-MM-DD (optional)",
  "target_date": "YYYY-MM-DD (optional)",
  "status": "backlog|planned|in-progress|paused|completed|cancelled (default: planned)",
  "lead": "uuid (optional, user id)",
  "members": ["uuid"]
}
```

#### Cycle

```json
{
  "name": "string (required, max 255)",
  "description": "string (optional)",
  "start_date": "ISO datetime (optional)",
  "end_date": "ISO datetime (optional)",
  "owned_by": "uuid (required, user id)"
}
```

#### Issue Link

```json
{
  "title": "string (optional, max 255)",
  "url": "string (required, valid URL)",
  "metadata": {}
}
```

#### Issue Comment

```json
{
  "comment_html": "string (HTML content)",
  "access": "INTERNAL|EXTERNAL (default: INTERNAL)"
}
```

#### Issue Relation

```json
{
  "related_issue": "uuid (required)",
  "relation_type": "duplicate|relates_to|blocked_by|start_before|finish_before|implemented_by"
}
```

### Priority Values

| Value    | Display        |
| -------- | -------------- |
| `urgent` | Urgent         |
| `high`   | High           |
| `medium` | Medium         |
| `low`    | Low            |
| `none`   | None (default) |

### State Groups

| Value       | Display   | Description     |
| ----------- | --------- | --------------- |
| `backlog`   | Backlog   | Not yet started |
| `unstarted` | Unstarted | Ready to start  |
| `started`   | Started   | In progress     |
| `completed` | Completed | Done            |
| `cancelled` | Cancelled | Won't do        |
| `triage`    | Triage    | Needs review    |

### Module Status

| Value         | Display     |
| ------------- | ----------- |
| `backlog`     | Backlog     |
| `planned`     | Planned     |
| `in-progress` | In Progress |
| `paused`      | Paused      |
| `completed`   | Completed   |
| `cancelled`   | Cancelled   |

### Relation Types

| Value            | Display        | Reverse                |
| ---------------- | -------------- | ---------------------- |
| `blocked_by`     | Blocked By     | blocking               |
| `relates_to`     | Relates To     | relates_to (symmetric) |
| `duplicate`      | Duplicate      | duplicate (symmetric)  |
| `start_before`   | Start Before   | start_after            |
| `finish_before`  | Finish Before  | finish_after           |
| `implemented_by` | Implemented By | implements             |

## Import Order (Recommended)

To avoid validation errors, import entities in this order:

1. **States** - Create custom workflow states first
2. **Labels** - Create labels for categorization
3. **Modules** - Create feature groupings
4. **Cycles** - Create time-boxed iterations
5. **Issues (parents first)** - Create parent issues before children
6. **Issue Links** - Add external references
7. **Issue Comments** - Add discussion threads
8. **Module/Cycle assignments** - Link issues to modules/cycles

## Authentication

All API requests require authentication via:

- Session cookie (browser)
- API token: `Authorization: Bearer <api-token>`

Create API tokens at: `/settings/api-tokens/`

## Example: Complete Issue Import

```bash
# 1. Create a state
curl -X POST "http://localhost:3005/api/workspaces/{slug}/projects/{project_id}/states/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Review",
    "color": "#3B82F6",
    "group": "started"
  }'

# 2. Create a label
curl -X POST "http://localhost:3005/api/workspaces/{slug}/projects/{project_id}/labels/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bug",
    "color": "#EF4444"
  }'

# 3. Create an issue
curl -X POST "http://localhost:3005/api/workspaces/{slug}/projects/{project_id}/issues/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fix login bug",
    "description_html": "<p>Users cannot login with SSO</p>",
    "priority": "high",
    "state_id": "<state-uuid>",
    "label_ids": ["<label-uuid>"],
    "assignee_ids": ["<user-uuid>"],
    "start_date": "2025-12-29",
    "target_date": "2026-01-05"
  }'
```

## CSV Template Headers

```csv
name,description_html,priority,state_id,assignee_ids,label_ids,parent_id,start_date,target_date
```

Note: `assignee_ids` and `label_ids` should be JSON arrays in CSV cells.
