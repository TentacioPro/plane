"use client";

import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight, Copy, Download, Upload } from "lucide-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { CustomSearchSelect, EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
// components
import { ExportForm } from "@/components/exporter/export-form";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";

export type TBulkImportExportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug?: string;
};

type SchemaSection = {
  id: string;
  title: string;
  endpoint: string;
  method: string;
  description: string;
  schema: Record<string, string>;
  example: Record<string, unknown>;
};

const SCHEMA_SECTIONS: SchemaSection[] = [
  {
    id: "issue",
    title: "Issue (Work Item)",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/issues/",
    method: "POST",
    description: "Create issues/work items in a project",
    schema: {
      name: "string (required, max 255)",
      description_html: "string (HTML content)",
      priority: "urgent|high|medium|low|none",
      state_id: "uuid (project state)",
      parent_id: "uuid (parent issue in same project)",
      assignee_ids: "uuid[] (project members)",
      label_ids: "uuid[] (project labels)",
      start_date: "YYYY-MM-DD",
      target_date: "YYYY-MM-DD",
      estimate_point: "uuid (EstimatePoint id)",
      type_id: "uuid (IssueType id)",
    },
    example: {
      name: "Implement user authentication",
      description_html: "<p>Add OAuth2 login flow</p>",
      priority: "high",
      state_id: "<state-uuid>",
      assignee_ids: ["<user-uuid>"],
      label_ids: ["<label-uuid>"],
      start_date: "2025-12-29",
      target_date: "2026-01-15",
    },
  },
  {
    id: "state",
    title: "State (Workflow)",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/states/",
    method: "POST",
    description: "Create workflow states for issues",
    schema: {
      name: "string (required, max 255)",
      description: "string",
      color: "string (hex, e.g. #60646C)",
      group: "backlog|unstarted|started|completed|cancelled",
      default: "boolean",
    },
    example: {
      name: "Code Review",
      color: "#3B82F6",
      group: "started",
      default: false,
    },
  },
  {
    id: "label",
    title: "Label",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/labels/",
    method: "POST",
    description: "Create labels for categorizing issues",
    schema: {
      name: "string (required, max 255)",
      description: "string",
      color: "string (hex color)",
      parent: "uuid (parent label)",
    },
    example: {
      name: "bug",
      color: "#EF4444",
      description: "Software defects",
    },
  },
  {
    id: "module",
    title: "Module",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/modules/",
    method: "POST",
    description: "Create modules for feature grouping",
    schema: {
      name: "string (required, max 255)",
      description: "string",
      start_date: "YYYY-MM-DD",
      target_date: "YYYY-MM-DD",
      status: "backlog|planned|in-progress|paused|completed|cancelled",
      lead: "uuid (user id)",
      members: "uuid[] (user ids)",
    },
    example: {
      name: "Authentication Module",
      description: "User auth and authorization features",
      status: "in-progress",
      start_date: "2025-12-01",
      target_date: "2026-01-31",
    },
  },
  {
    id: "cycle",
    title: "Cycle (Sprint)",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/cycles/",
    method: "POST",
    description: "Create time-boxed iterations",
    schema: {
      name: "string (required, max 255)",
      description: "string",
      start_date: "ISO datetime",
      end_date: "ISO datetime",
      owned_by: "uuid (required, user id)",
    },
    example: {
      name: "Sprint 1",
      description: "Initial development sprint",
      start_date: "2025-12-29T00:00:00Z",
      end_date: "2026-01-12T23:59:59Z",
    },
  },
  {
    id: "link",
    title: "Issue Link",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/issues/{issue_id}/links/",
    method: "POST",
    description: "Add external links to issues",
    schema: {
      title: "string (max 255)",
      url: "string (required, valid URL)",
      metadata: "object",
    },
    example: {
      title: "Design Document",
      url: "https://docs.example.com/design",
    },
  },
  {
    id: "comment",
    title: "Issue Comment",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/issues/{issue_id}/comments/",
    method: "POST",
    description: "Add comments to issues",
    schema: {
      comment_html: "string (HTML content)",
      access: "INTERNAL|EXTERNAL",
    },
    example: {
      comment_html: "<p>Updated the implementation approach</p>",
      access: "INTERNAL",
    },
  },
  {
    id: "relation",
    title: "Issue Relation",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/issues/{issue_id}/relations/",
    method: "POST",
    description: "Create relationships between issues",
    schema: {
      related_issue: "uuid (required)",
      relation_type: "duplicate|relates_to|blocked_by|start_before|finish_before|implemented_by",
    },
    example: {
      related_issue: "<issue-uuid>",
      relation_type: "blocked_by",
    },
  },
];

const IMPORT_TEMPLATE_HEADERS = [
  "name",
  "description_html",
  "priority",
  "state_id",
  "assignee_ids",
  "label_ids",
  "parent_id",
  "start_date",
  "target_date",
];

const IMPORT_ORDER = [
  { step: 1, entity: "States", reason: "Required for issue workflow" },
  { step: 2, entity: "Labels", reason: "Required for issue categorization" },
  { step: 3, entity: "Modules", reason: "Feature groupings" },
  { step: 4, entity: "Cycles", reason: "Time-boxed iterations" },
  { step: 5, entity: "Issues (parents)", reason: "Parent issues before children" },
  { step: 6, entity: "Issues (children)", reason: "Child issues with parent_id" },
  { step: 7, entity: "Links & Comments", reason: "Issue attachments" },
];

export const BulkImportExportModal = observer(function BulkImportExportModal(props: TBulkImportExportModalProps) {
  const { isOpen, onClose, workspaceSlug } = props;
  const { workspaceSlug: routeWorkspaceSlug } = useParams();
  const effectiveWorkspaceSlug = workspaceSlug || (routeWorkspaceSlug?.toString() ?? "");
  const { t } = useTranslation();

  // stores
  const { workspaceProjectIds, getProjectById } = useProject();
  const { allowPermissions } = useUserPermissions();

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["issue"]));
  const [activeTab, setActiveTab] = useState<"export" | "import">("import");

  const canManageWorkspaceData = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE,
    effectiveWorkspaceSlug
  );

  useEffect(() => {
    if (!selectedProjectId && workspaceProjectIds && workspaceProjectIds.length > 0) {
      setSelectedProjectId(workspaceProjectIds[0]);
    }
  }, [selectedProjectId, workspaceProjectIds]);

  const projectOptions = useMemo(
    () =>
      workspaceProjectIds?.map((projectId) => {
        const projectDetails = getProjectById(projectId);
        return {
          value: projectDetails?.id,
          query: `${projectDetails?.name} ${projectDetails?.identifier}`,
          content: (
            <div className="flex items-center gap-2">
              <span className="text-10 text-secondary flex-shrink-0">{projectDetails?.identifier}</span>
              <span className="truncate">{projectDetails?.name}</span>
            </div>
          ),
        };
      }) ?? [],
    [getProjectById, workspaceProjectIds]
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getEndpointWithParams = (endpoint: string) => {
    return endpoint
      .replace("{slug}", effectiveWorkspaceSlug || ":slug")
      .replace("{project_id}", selectedProjectId || ":project_id");
  };

  const handleCopyJson = async (json: Record<string, unknown>) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("copied"),
        message: "JSON copied to clipboard",
      });
    } catch (_error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: "Failed to copy",
      });
    }
  };

  const handleCopyEndpoint = async (endpoint: string) => {
    if (!effectiveWorkspaceSlug) return;
    const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${getEndpointWithParams(endpoint)}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("copied"),
        message: "Endpoint copied to clipboard",
      });
    } catch (_error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: "Failed to copy",
      });
    }
  };

  const handleDownloadTemplate = () => {
    const rows = [
      IMPORT_TEMPLATE_HEADERS.join(","),
      `"Implement feature","<p>Feature description</p>",high,"<state-uuid>","[\\"<user-uuid>\\"]","[\\"<label-uuid>\\"]",,${new Date()
        .toISOString()
        .slice(0, 10)},${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`,
      `"Fix bug","<p>Bug description</p>",urgent,"<state-uuid>","[\\"<user-uuid>\\"]","[\\"<label-uuid>\\"]",,${new Date()
        .toISOString()
        .slice(0, 10)},${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`,
    ];
    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "plane-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullSchema = () => {
    const schemaDoc = {
      _info: {
        title: "Plane Bulk Import Schema",
        version: "1.0",
        generated: new Date().toISOString(),
        workspace: effectiveWorkspaceSlug,
        project: selectedProjectId,
      },
      import_order: IMPORT_ORDER,
      endpoints: SCHEMA_SECTIONS.map((s) => ({
        entity: s.title,
        method: s.method,
        endpoint: getEndpointWithParams(s.endpoint),
        description: s.description,
        schema: s.schema,
        example: s.example,
      })),
      enums: {
        priority: ["urgent", "high", "medium", "low", "none"],
        state_group: ["backlog", "unstarted", "started", "completed", "cancelled"],
        module_status: ["backlog", "planned", "in-progress", "paused", "completed", "cancelled"],
        relation_type: ["duplicate", "relates_to", "blocked_by", "start_before", "finish_before", "implemented_by"],
        comment_access: ["INTERNAL", "EXTERNAL"],
      },
    };
    const blob = new Blob([JSON.stringify(schemaDoc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "plane-import-schema.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} width={EModalWidth.XXXXL} position={EModalPosition.TOP}>
      <div className="flex flex-col gap-4 p-6 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-primary">Bulk Import & Export</h3>
            <p className="text-sm text-secondary">
              Complete API schema for bulk data operations. Use these endpoints to populate your workspace with existing
              data.
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={onClose} className="w-full sm:w-auto">
            {t("close")}
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border-base">
          <button
            onClick={() => setActiveTab("import")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "import"
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            <Upload className="inline-block w-4 h-4 mr-2" />
            Import Schema
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "export"
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            <Download className="inline-block w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>

        {/* Project Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-secondary">Target Project:</span>
            <CustomSearchSelect
              value={selectedProjectId ? [selectedProjectId] : []}
              onChange={(values: string[]) => setSelectedProjectId(values?.[0])}
              options={projectOptions}
              input
              multiple={false}
              label={
                selectedProjectId ? (getProjectById(selectedProjectId)?.name ?? "Select project") : "Select project"
              }
              placement="bottom-start"
              optionsClassName="max-w-64"
              disabled={!canManageWorkspaceData || projectOptions.length === 0}
            />
          </div>
          {!canManageWorkspaceData && (
            <p className="text-xs text-amber-600">Only workspace Admins or Members can use bulk operations.</p>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "import" ? (
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={!canManageWorkspaceData}
                >
                  <Download className="w-4 h-4 mr-1" />
                  CSV Template
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadFullSchema}
                  disabled={!canManageWorkspaceData}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Full Schema JSON
                </Button>
              </div>

              {/* Import Order */}
              <div className="rounded-lg border border-border-base bg-surface-1 p-4">
                <h4 className="text-sm font-medium text-primary mb-3">Recommended Import Order</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {IMPORT_ORDER.map((item) => (
                    <div key={item.step} className="flex items-start gap-2 text-xs">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-medium">
                        {item.step}
                      </span>
                      <div>
                        <div className="font-medium text-primary">{item.entity}</div>
                        <div className="text-secondary">{item.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schema Sections */}
              <div className="space-y-2">
                {SCHEMA_SECTIONS.map((section) => (
                  <div key={section.id} className="rounded-lg border border-border-base bg-surface-1 overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedSections.has(section.id) ? (
                          <ChevronDown className="w-4 h-4 text-secondary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-secondary" />
                        )}
                        <span className="font-medium text-primary">{section.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-secondary">
                          {section.method}
                        </span>
                      </div>
                      <span className="text-xs text-secondary hidden sm:block">{section.description}</span>
                    </button>

                    {expandedSections.has(section.id) && (
                      <div className="border-t border-border-base p-4 space-y-4">
                        {/* Endpoint */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-secondary">Endpoint</span>
                            <button
                              onClick={() => void handleCopyEndpoint(section.endpoint)}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                              disabled={!canManageWorkspaceData}
                            >
                              <Copy className="w-3 h-3" /> Copy URL
                            </button>
                          </div>
                          <code className="block text-xs bg-surface-2 p-2 rounded font-mono break-all">
                            {section.method} {getEndpointWithParams(section.endpoint)}
                          </code>
                        </div>

                        {/* Schema */}
                        <div>
                          <span className="text-xs font-medium text-secondary block mb-1">Schema</span>
                          <div className="bg-surface-2 rounded p-2 text-xs font-mono space-y-1">
                            {Object.entries(section.schema).map(([key, value]) => (
                              <div key={key} className="flex">
                                <span className="text-blue-600 dark:text-blue-400 min-w-[140px]">{key}:</span>
                                <span className="text-secondary">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Example */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-secondary">Example Payload</span>
                            <button
                              onClick={() => void handleCopyJson(section.example)}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                              disabled={!canManageWorkspaceData}
                            >
                              <Copy className="w-3 h-3" /> Copy JSON
                            </button>
                          </div>
                          <pre className="bg-surface-2 rounded p-2 text-xs font-mono overflow-x-auto">
                            {JSON.stringify(section.example, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Auth Info */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4">
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">Authentication</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                  All API requests require authentication. Use one of these methods:
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                  <li>
                    <strong>API Token:</strong> <code>Authorization: Bearer &lt;api-token&gt;</code>
                  </li>
                  <li>
                    <strong>Session Cookie:</strong> Automatically included in browser requests
                  </li>
                </ul>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  Create API tokens at: <code>/settings/api-tokens/</code>
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border-base bg-surface-1 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Download className="h-4 w-4 text-tertiary" />
                <div>
                  <div className="text-sm font-medium text-primary">Export Project Data</div>
                  <p className="text-xs text-secondary">
                    Queue a CSV, JSON, or XLSX export. Results are delivered via the export worker and stored in MinIO.
                  </p>
                </div>
              </div>
              {effectiveWorkspaceSlug ? (
                <ExportForm workspaceSlug={effectiveWorkspaceSlug} mutateServices={() => undefined} />
              ) : (
                <p className="rounded-md bg-surface-2 p-3 text-sm text-secondary">
                  Select a workspace to configure exports.
                </p>
              )}
              <p className="mt-3 text-xs text-secondary">
                Exports respect project-level permissions; only projects where you have access appear in the list.
              </p>
            </div>
          )}
        </div>
      </div>
    </ModalCore>
  );
});
