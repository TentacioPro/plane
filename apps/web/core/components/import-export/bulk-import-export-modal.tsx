"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileUp,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { CycleIcon, IntakeIcon, ModuleIcon, PageIcon, ViewsIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { CustomSearchSelect, CustomSelect, EModalPosition, EModalWidth, ModalCore, ToggleSwitch } from "@plane/ui";
import { projectIdentifierSanitizer } from "@plane/utils";
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

type ImportMode = "full" | "single";
type ImportEntityType = "issue" | "state" | "label" | "module" | "cycle" | "page";

type ImportResult = {
  success: number;
  failed: number;
  errors: string[];
};

type FullProjectData = {
  states?: Record<string, unknown>[];
  labels?: Record<string, unknown>[];
  modules?: Record<string, unknown>[];
  cycles?: Record<string, unknown>[];
  pages?: Record<string, unknown>[];
  issues?: Record<string, unknown>[];
  work_items?: Record<string, unknown>[]; // Alias for issues
};

type ParsedImportData = {
  mode: ImportMode;
  entityType?: ImportEntityType;
  data: Record<string, unknown>[] | FullProjectData;
};

const SCHEMA_SECTIONS: SchemaSection[] = [
  {
    id: "issue",
    title: "Work Item (Issue)",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/issues/",
    method: "POST",
    description: "Create work items/issues in a project",
    schema: {
      name: "string (required, max 255)",
      description_html: "string (HTML content)",
      priority: "urgent|high|medium|low|none",
      state: "uuid (project state) or temp_id reference",
      parent: "uuid (parent issue in same project)",
      assignees: "uuid[] (project members)",
      labels: "uuid[] (project labels) or temp_id references",
      start_date: "YYYY-MM-DD",
      target_date: "YYYY-MM-DD",
      type_id: "uuid (issue type)",
      estimate_point: "uuid (estimate point)",
      modules: "temp_id[] (linked post-creation)",
      cycle: "temp_id (linked post-creation)",
    },
    example: {
      name: "Implement user authentication",
      description_html: "<p>Add OAuth2 login flow</p>",
      priority: "high",
      start_date: "2025-12-29",
      target_date: "2026-01-15",
      state: "state-todo",
      labels: ["label-feature"],
      modules: ["module-auth"],
      cycle: "cycle-sprint1",
      assignees: [],
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
      group: "backlog|unstarted|started|completed|cancelled|triage",
      sequence: "float (optional, auto-calculated)",
      default: "boolean (optional)",
    },
    example: {
      name: "Code Review",
      color: "#3B82F6",
      group: "started",
    },
  },
  {
    id: "label",
    title: "Label",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/issue-labels/",
    method: "POST",
    description: "Create labels for categorizing issues",
    schema: {
      name: "string (required, max 255)",
      description: "string",
      color: "string (hex color)",
      parent: "uuid (parent label id)",
      sort_order: "float (optional)",
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
      description_html: "string (HTML content)",
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
      owned_by: "uuid (user id, defaults to current user)",
      timezone: "string (e.g. UTC, America/New_York)",
    },
    example: {
      name: "Sprint 1",
      description: "Initial development sprint",
      start_date: "2025-12-29T00:00:00Z",
      end_date: "2026-01-12T23:59:59Z",
    },
  },
  {
    id: "page",
    title: "Page (Documentation)",
    endpoint: "/api/workspaces/{slug}/projects/{project_id}/pages/",
    method: "POST",
    description: "Create documentation pages",
    schema: {
      name: "string (required)",
      description_html: "string (HTML content)",
      access: "0 (public) | 1 (private)",
      color: "string (hex color)",
      parent: "uuid (parent page id)",
    },
    example: {
      name: "Project Overview",
      description_html: "<h1>Welcome</h1><p>Project documentation</p>",
      access: 0,
      color: "#3B82F6",
    },
  },
];

const IMPORT_ORDER = [
  { step: 1, entity: "States", reason: "Required for work item workflow" },
  { step: 2, entity: "Labels", reason: "Required for categorization" },
  { step: 3, entity: "Modules", reason: "Feature groupings" },
  { step: 4, entity: "Cycles", reason: "Time-boxed iterations" },
  { step: 5, entity: "Pages", reason: "Documentation" },
  { step: 6, entity: "Work Items", reason: "Tasks (can reference all above)" },
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

  // File upload states
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("full");
  const [importEntityType, setImportEntityType] = useState<ImportEntityType>("issue");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentImportItem, setCurrentImportItem] = useState<string>("");
  const [importProgress, setImportProgress] = useState<number>(0);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectIdentifier, setNewProjectIdentifier] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreatingProjectLoading, setIsCreatingProjectLoading] = useState(false);
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);
  const [projectFeatures, setProjectFeatures] = useState({
    cycles: true,
    modules: true,
    views: true,
    pages: true,
    intake: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          value: projectId, // Use projectId directly, not projectDetails?.id
          query: `${projectDetails?.name ?? ""} ${projectDetails?.identifier ?? ""}`,
          content: (
            <div className="flex items-center gap-2">
              <span className="text-xs text-tertiary flex-shrink-0">{projectDetails?.identifier}</span>
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
      setToast({ type: TOAST_TYPE.SUCCESS, title: t("copied"), message: "JSON copied to clipboard" });
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: t("error"), message: "Failed to copy" });
    }
  };

  const handleCopyEndpoint = async (endpoint: string) => {
    if (!effectiveWorkspaceSlug) return;
    const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${getEndpointWithParams(endpoint)}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setToast({ type: TOAST_TYPE.SUCCESS, title: t("copied"), message: "Endpoint copied to clipboard" });
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: t("error"), message: "Failed to copy" });
    }
  };

  // Download full project template with cross-references
  const handleDownloadFullTemplate = () => {
    const template = {
      _info: {
        description: "Full project import template with cross-references",
        import_order: "states → labels → modules → cycles → pages → work_items/issues",
        temp_id_usage: "Use temp_id to reference entities before they're created",
        note: "Work items use 'state', 'labels', 'assignees' fields (not state_id, label_ids). You can use either 'issues' or 'work_items' key.",
        module_cycle_linking:
          "Work items can reference 'modules' (array) and 'cycle' (string) - linked via separate API calls after creation",
      },
      states: [
        { temp_id: "state-backlog", name: "Backlog", color: "#6B7280", group: "backlog" },
        { temp_id: "state-todo", name: "Todo", color: "#3B82F6", group: "unstarted" },
        { temp_id: "state-progress", name: "In Progress", color: "#F59E0B", group: "started" },
        { temp_id: "state-done", name: "Done", color: "#10B981", group: "completed" },
      ],
      labels: [
        { temp_id: "label-bug", name: "bug", color: "#EF4444", description: "Software defects" },
        { temp_id: "label-feature", name: "feature", color: "#3B82F6", description: "New features" },
        { temp_id: "label-docs", name: "documentation", color: "#8B5CF6", description: "Documentation updates" },
      ],
      modules: [
        { temp_id: "module-core", name: "Core Module", description: "Core functionality", status: "planned" },
        { temp_id: "module-auth", name: "Authentication", description: "User auth features", status: "in-progress" },
      ],
      cycles: [
        {
          temp_id: "cycle-sprint1",
          name: "Sprint 1",
          description: "First sprint",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      pages: [
        {
          temp_id: "page-overview",
          name: "Project Overview",
          description_html: "<h1>Welcome</h1><p>This is the project overview page.</p>",
          access: 0,
        },
        {
          temp_id: "page-api-docs",
          name: "API Documentation",
          description_html: "<h1>API Reference</h1><p>REST API endpoints documentation.</p>",
          access: 0,
        },
      ],
      work_items: [
        {
          name: "Setup project structure",
          priority: "high",
          description_html: "<p>Initial project setup and configuration</p>",
          state: "state-todo",
          labels: ["label-feature"],
          modules: ["module-core"],
          cycle: "cycle-sprint1",
          assignees: [],
        },
        {
          name: "Implement user login",
          priority: "high",
          description_html: "<p>Add OAuth2 login flow</p>",
          state: "state-progress",
          labels: ["label-feature"],
          modules: ["module-auth"],
          cycle: "cycle-sprint1",
          assignees: [],
        },
        {
          name: "Fix login redirect bug",
          priority: "urgent",
          description_html: "<p>Users redirected to wrong page after login</p>",
          state: "state-backlog",
          labels: ["label-bug"],
          modules: ["module-auth"],
          assignees: [],
        },
        {
          name: "Write API documentation",
          priority: "medium",
          description_html: "<p>Document all REST endpoints</p>",
          state: "state-backlog",
          labels: ["label-docs"],
          modules: ["module-core"],
          assignees: [],
        },
      ],
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "plane-full-project-template.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Download single entity template
  const handleDownloadEntityTemplate = (entityType: ImportEntityType) => {
    const templates: Record<ImportEntityType, Record<string, unknown>[]> = {
      state: [
        { name: "Backlog", color: "#6B7280", group: "backlog" },
        { name: "Todo", color: "#3B82F6", group: "unstarted" },
        { name: "In Progress", color: "#F59E0B", group: "started" },
        { name: "Done", color: "#10B981", group: "completed" },
      ],
      label: [
        { name: "bug", color: "#EF4444", description: "Software defects" },
        { name: "feature", color: "#3B82F6", description: "New features" },
      ],
      module: [{ name: "Core Module", description: "Core functionality", status: "planned" }],
      cycle: [
        {
          name: "Sprint 1",
          description: "First sprint",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      page: [
        {
          name: "Project Overview",
          description_html: "<h1>Welcome</h1><p>Project documentation page.</p>",
          access: 0,
        },
        {
          name: "API Documentation",
          description_html: "<h1>API Reference</h1><p>REST API endpoints.</p>",
          access: 0,
        },
      ],
      issue: [
        {
          name: "Work Item 1",
          priority: "high",
          description_html: "<p>Description of the work item</p>",
          state: "state-todo",
          labels: ["label-feature"],
          modules: ["module-core"],
          cycle: "cycle-sprint1",
          assignees: [],
        },
        {
          name: "Work Item 2",
          priority: "medium",
          description_html: "<p>Another work item</p>",
          assignees: [],
          labels: [],
        },
      ],
    };
    const blob = new Blob([JSON.stringify(templates[entityType], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    // Use "work-items" for issue downloads for clarity
    const filename = entityType === "issue" ? "plane-work-items-template.json" : `plane-${entityType}s-template.json`;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // File parsing
  const handleFileSelect = useCallback(
    (file: File) => {
      setUploadedFile(file);
      setImportResult(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed: unknown = JSON.parse(text);

          // Detect if it's a full project import or single entity
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const parsedObj = parsed as Record<string, unknown>;
            const keys = Object.keys(parsedObj);
            // Support both "issues" and "work_items" as valid keys
            const entityKeys = ["states", "labels", "modules", "cycles", "pages", "issues", "work_items"];
            const hasEntityKeys = keys.some((k) => entityKeys.includes(k));
            if (hasEntityKeys) {
              // Normalize work_items to issues for processing
              const normalizedData = { ...parsedObj } as FullProjectData;
              if (normalizedData.work_items && !normalizedData.issues) {
                normalizedData.issues = normalizedData.work_items;
                delete normalizedData.work_items;
              }
              setParsedData({ mode: "full", data: normalizedData });
              setImportMode("full");
              return;
            }
          }

          // Single entity array
          const data = Array.isArray(parsed)
            ? (parsed as Record<string, unknown>[])
            : [parsed as Record<string, unknown>];
          setParsedData({ mode: "single", entityType: importEntityType, data });
          setImportMode("single");
        } catch (err) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Parse Error",
            message: `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
          });
          setParsedData(null);
        }
      };
      reader.readAsText(file);
    },
    [importEntityType]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".json")) {
        handleFileSelect(file);
      } else {
        setToast({ type: TOAST_TYPE.ERROR, title: "Invalid File", message: "Please upload a JSON file" });
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const clearUpload = useCallback(() => {
    setUploadedFile(null);
    setParsedData(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Use non-v1 API endpoints (session auth) for all entities
  // Note: v1 API requires X-Api-Key header, but we use session cookies
  const getApiEndpoint = (entityType: ImportEntityType): string => {
    const endpoints: Record<ImportEntityType, string> = {
      issue: `/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/issues/`,
      state: `/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/states/`,
      label: `/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/issue-labels/`,
      module: `/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/modules/`,
      cycle: `/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/cycles/`,
      page: `/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/pages/`,
    };
    return endpoints[entityType];
  };

  // Get module-issue linking endpoint
  const getModuleIssueEndpoint = (moduleId: string): string =>
    `/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/modules/${moduleId}/issues/`;

  // Get cycle-issue linking endpoint
  const getCycleIssueEndpoint = (cycleId: string): string =>
    `/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/cycles/${cycleId}/cycle-issues/`;

  const importEntities = async (
    entityType: ImportEntityType,
    items: Record<string, unknown>[]
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    const result = { success: 0, failed: 0, errors: [] as string[] };
    const endpoint = getApiEndpoint(entityType);

    let currentCount = 0;
    const total = items.length;

    for (const item of items) {
      currentCount++;
      setImportProgress(Math.round((currentCount / total) * 100));
      setCurrentImportItem(`${entityType}: ${(item as { name?: string }).name || "item"}`);
      await new Promise((resolve) => setTimeout(resolve, 10));

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(item),
        });
        if (response.ok) {
          result.success++;
        } else {
          result.failed++;
          const errorData = (await response.json().catch(() => ({}))) as { detail?: string; error?: string };
          const errorMsg = errorData.detail || errorData.error || `HTTP ${response.status}`;
          result.errors.push(`${entityType}: ${(item as { name?: string }).name || "unknown"} - ${errorMsg}`);
        }
      } catch (err) {
        result.failed++;
        result.errors.push(`${entityType}: ${err instanceof Error ? err.message : "Network error"}`);
      }
    }
    return result;
  };

  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectIdentifier || !effectiveWorkspaceSlug) return;
    setIsCreatingProjectLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${effectiveWorkspaceSlug}/projects/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newProjectName,
          identifier: newProjectIdentifier.toUpperCase(),
          description: newProjectDescription,
          emoji: "📊",
          network: 2, // Secret project by default
          cycle_view: projectFeatures.cycles,
          module_view: projectFeatures.modules,
          issue_views_view: projectFeatures.views,
          page_view: projectFeatures.pages,
          inbox_view: projectFeatures.intake,
        }),
      });

      if (response.ok) {
        const project = (await response.json()) as { id: string; name: string };
        setSelectedProjectId(project.id);
        setIsCreatingProject(false);
        setNewProjectName("");
        setNewProjectIdentifier("");
        setNewProjectDescription("");
        setIsIdentifierTouched(false);
        setProjectFeatures({
          cycles: true,
          modules: true,
          views: true,
          pages: true,
          intake: false,
        });
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Project Created",
          message: `Project ${project.name} created successfully`,
        });
      } else {
        const error = (await response.json()) as { message?: string };
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Creation Failed",
          message: error.message || "Failed to create project",
        });
      }
    } catch (_err) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error",
        message: "An error occurred while creating the project",
      });
    } finally {
      setIsCreatingProjectLoading(false);
    }
  };

  // Enhanced import with ID mapping for full project context
  const handleImport = async () => {
    if (!parsedData || !selectedProjectId || !effectiveWorkspaceSlug) return;
    setIsImporting(true);
    setImportResult(null);
    setImportProgress(0);
    setCurrentImportItem("Starting import...");

    const totalResult: ImportResult = { success: 0, failed: 0, errors: [] };

    let totalItems = 0;
    let processedItems = 0;

    if (parsedData.mode === "full") {
      const fullData = parsedData.data as FullProjectData;
      totalItems =
        (fullData.states?.length || 0) +
        (fullData.labels?.length || 0) +
        (fullData.modules?.length || 0) +
        (fullData.cycles?.length || 0) +
        (fullData.pages?.length || 0) +
        (fullData.issues?.length || 0);
    } else {
      totalItems = (parsedData.data as unknown[]).length;
    }

    // ID mapping for cross-references (temp_id -> real_id)
    const idMap: Record<string, string> = {};
    // Track issues that need module/cycle linking (post-creation)
    const issueLinkQueue: { issueId: string; moduleIds: string[]; cycleId?: string }[] = [];

    if (parsedData.mode === "full") {
      const fullData = parsedData.data as FullProjectData;

      // Import in order with ID mapping
      const importOrder: { key: keyof FullProjectData; type: ImportEntityType }[] = [
        { key: "states", type: "state" },
        { key: "labels", type: "label" },
        { key: "modules", type: "module" },
        { key: "cycles", type: "cycle" },
        { key: "pages", type: "page" },
        { key: "issues", type: "issue" },
      ];

      for (const { key, type } of importOrder) {
        const items = fullData[key];
        if (items && items.length > 0) {
          const endpoint = getApiEndpoint(type);

          for (const item of items) {
            processedItems++;
            setImportProgress(Math.round((processedItems / totalItems) * 100));
            setCurrentImportItem(`${type}: ${(item as { name?: string }).name || "item"}`);
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Replace temp IDs with real IDs for issues
            const processedItem = { ...item };
            // Store module/cycle refs before removing them (they need separate API calls)
            let moduleRefs: string[] = [];
            let cycleRef: string | undefined;

            if (type === "issue") {
              // Map state if it's a temp reference (API uses 'state' not 'state_id')
              if (processedItem.state && typeof processedItem.state === "string") {
                const mappedId = idMap[processedItem.state];
                if (mappedId) processedItem.state = mappedId;
              }
              // Also support state_id for backward compatibility
              if (processedItem.state_id && typeof processedItem.state_id === "string") {
                const mappedId = idMap[processedItem.state_id];
                if (mappedId) {
                  processedItem.state = mappedId;
                  delete processedItem.state_id;
                }
              }
              // Map labels (API uses 'labels' not 'label_ids')
              if (Array.isArray(processedItem.labels)) {
                processedItem.labels = (processedItem.labels as string[]).map((id) => idMap[id] || id);
              }
              // Also support label_ids for backward compatibility
              if (Array.isArray(processedItem.label_ids)) {
                processedItem.labels = (processedItem.label_ids as string[]).map((id) => idMap[id] || id);
                delete processedItem.label_ids;
              }
              // Map assignees (API uses 'assignees' not 'assignee_ids')
              if (Array.isArray(processedItem.assignee_ids)) {
                processedItem.assignees = processedItem.assignee_ids;
                delete processedItem.assignee_ids;
              }
              // Map parent (API uses 'parent' not 'parent_id')
              if (processedItem.parent_id && typeof processedItem.parent_id === "string") {
                const mappedId = idMap[processedItem.parent_id];
                if (mappedId) {
                  processedItem.parent = mappedId;
                  delete processedItem.parent_id;
                }
              }
              if (processedItem.parent && typeof processedItem.parent === "string") {
                const mappedId = idMap[processedItem.parent];
                if (mappedId) processedItem.parent = mappedId;
              }
              // Extract module refs (need separate API call after issue creation)
              if (Array.isArray(processedItem.module_ids)) {
                moduleRefs = (processedItem.module_ids as string[]).map((id) => idMap[id] || id);
                delete processedItem.module_ids;
              }
              if (processedItem.module_id && typeof processedItem.module_id === "string") {
                const mappedId = idMap[processedItem.module_id] || processedItem.module_id;
                moduleRefs = [mappedId];
                delete processedItem.module_id;
              }
              if (Array.isArray(processedItem.modules)) {
                moduleRefs = (processedItem.modules as string[]).map((id) => idMap[id] || id);
                delete processedItem.modules;
              }
              // Extract cycle ref (need separate API call after issue creation)
              if (processedItem.cycle_id && typeof processedItem.cycle_id === "string") {
                cycleRef = idMap[processedItem.cycle_id] || processedItem.cycle_id;
                delete processedItem.cycle_id;
              }
              if (processedItem.cycle && typeof processedItem.cycle === "string") {
                cycleRef = idMap[processedItem.cycle] || processedItem.cycle;
                delete processedItem.cycle;
              }
            }
            // Add project_id for cycles
            if (type === "cycle" && !processedItem.project_id) {
              processedItem.project_id = selectedProjectId;
            }
            // Pages use session auth (not API v1)
            if (type === "page") {
              // Pages don't need project_id in body, it's in the URL
            }

            try {
              const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(processedItem),
              });

              if (response.ok) {
                totalResult.success++;
                const created = (await response.json()) as { id: string };
                // Store ID mapping if item has temp_id
                const tempId = (item as { temp_id?: string }).temp_id;
                if (tempId && created.id) {
                  idMap[tempId] = created.id;
                }
                // Also map by name for convenience
                const itemName = (item as { name?: string }).name;
                if (itemName && created.id) {
                  idMap[`${type}:${itemName}`] = created.id;
                }
                // Queue module/cycle linking for issues
                if (type === "issue" && created.id && (moduleRefs.length > 0 || cycleRef)) {
                  issueLinkQueue.push({ issueId: created.id, moduleIds: moduleRefs, cycleId: cycleRef });
                }
              } else {
                totalResult.failed++;
                const errorData = (await response.json().catch(() => ({}))) as { detail?: string; error?: string };
                const errorMsg = errorData.detail || errorData.error || `HTTP ${response.status}`;
                totalResult.errors.push(`${type}: ${(item as { name?: string }).name || "unknown"} - ${errorMsg}`);
              }
            } catch (err) {
              totalResult.failed++;
              totalResult.errors.push(`${type}: ${err instanceof Error ? err.message : "Network error"}`);
            }
          }
        }
      }

      // Process module/cycle links for issues (post-creation)
      for (const link of issueLinkQueue) {
        // Link to modules (uses /modules/{id}/issues/ endpoint with issue IDs array)
        for (const moduleId of link.moduleIds) {
          try {
            const moduleIssueEndpoint = getModuleIssueEndpoint(moduleId);
            const response = await fetch(moduleIssueEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ issues: [link.issueId] }),
            });
            if (!response.ok) {
              const errorData = (await response.json().catch(() => ({}))) as { detail?: string; error?: string };
              totalResult.errors.push(
                `module-link: Failed to link issue to module ${moduleId} - ${errorData.detail || errorData.error || response.status}`
              );
            }
          } catch (err) {
            totalResult.errors.push(`module-link: ${err instanceof Error ? err.message : "Network error"}`);
          }
        }
        // Link to cycle (uses /cycles/{id}/cycle-issues/ endpoint)
        if (link.cycleId) {
          try {
            const cycleIssueEndpoint = getCycleIssueEndpoint(link.cycleId);
            const response = await fetch(cycleIssueEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ issues: [link.issueId] }),
            });
            if (!response.ok) {
              const errorData = (await response.json().catch(() => ({}))) as { detail?: string; error?: string };
              totalResult.errors.push(
                `cycle-link: Failed to link issue to cycle ${link.cycleId} - ${errorData.detail || errorData.error || response.status}`
              );
            }
          } catch (err) {
            totalResult.errors.push(`cycle-link: ${err instanceof Error ? err.message : "Network error"}`);
          }
        }
      }
    } else {
      // Single entity import
      const items = parsedData.data as Record<string, unknown>[];
      const entityType = parsedData.entityType || importEntityType;
      const result = await importEntities(entityType, items);
      totalResult.success = result.success;
      totalResult.failed = result.failed;
      totalResult.errors = result.errors;
    }

    setImportResult(totalResult);
    setIsImporting(false);

    if (totalResult.success > 0) {
      setToast({
        type: totalResult.failed > 0 ? TOAST_TYPE.WARNING : TOAST_TYPE.SUCCESS,
        title: "Import Complete",
        message: `${totalResult.success} items imported${totalResult.failed > 0 ? `, ${totalResult.failed} failed` : ""}`,
      });
    } else {
      setToast({ type: TOAST_TYPE.ERROR, title: "Import Failed", message: "No items were imported" });
    }
  };

  const getImportSummary = (): string => {
    if (!parsedData) return "";
    if (parsedData.mode === "full") {
      const fullData = parsedData.data as FullProjectData;
      const counts = [];
      if (fullData.states?.length) counts.push(`${fullData.states.length} states`);
      if (fullData.labels?.length) counts.push(`${fullData.labels.length} labels`);
      if (fullData.modules?.length) counts.push(`${fullData.modules.length} modules`);
      if (fullData.cycles?.length) counts.push(`${fullData.cycles.length} cycles`);
      if (fullData.pages?.length) counts.push(`${fullData.pages.length} pages`);
      if (fullData.issues?.length) counts.push(`${fullData.issues.length} work items`);
      return counts.join(", ");
    }
    const items = parsedData.data as Record<string, unknown>[];
    const entityLabel =
      (parsedData.entityType || importEntityType) === "issue" ? "work item" : parsedData.entityType || importEntityType;
    return `${items.length} ${entityLabel}${items.length !== 1 ? "s" : ""}`;
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} width={EModalWidth.XXXXL} position={EModalPosition.TOP}>
      <div className="flex flex-col gap-4 p-6 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Bulk Import & Export</h3>
            <p className="text-sm text-tertiary mt-1">Import or export project data in bulk</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-subtle-1">
          <button
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "import"
                ? "border-accent-primary text-primary"
                : "border-transparent text-tertiary hover:text-primary"
            }`}
          >
            <Upload className="size-4" />
            Import Data
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "export"
                ? "border-accent-primary text-primary"
                : "border-transparent text-tertiary hover:text-primary"
            }`}
          >
            <Download className="size-4" />
            Export Data
          </button>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-tertiary">Project:</span>
          <CustomSearchSelect
            value={selectedProjectId}
            onChange={(value: string) => setSelectedProjectId(value)}
            options={projectOptions}
            input
            multiple={false}
            label={selectedProjectId ? (getProjectById(selectedProjectId)?.name ?? "Select") : "Select project"}
            placement="bottom-start"
            optionsClassName="max-w-64"
            disabled={!canManageWorkspaceData || projectOptions.length === 0}
          />
          {canManageWorkspaceData && (
            <Button variant="secondary" size="sm" onClick={() => setIsCreatingProject(!isCreatingProject)}>
              {isCreatingProject ? <X className="size-3.5 mr-1" /> : <Plus className="size-3.5 mr-1" />}
              {isCreatingProject ? "Cancel" : "New"}
            </Button>
          )}
          {!canManageWorkspaceData && (
            <span className="text-xs text-warning-primary">Admin or Member access required</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {isCreatingProject ? (
            <div className="rounded-lg border border-subtle-1 bg-layer-1 p-4 space-y-4">
              <h4 className="text-sm font-medium text-primary">Create New Project</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="new-project-name" className="text-xs text-tertiary mb-1 block">
                    Name
                  </label>
                  <input
                    id="new-project-name"
                    type="text"
                    className="w-full rounded-md border border-subtle-1 bg-layer-2 px-3 py-2 text-sm text-primary focus:border-accent-primary focus:outline-none"
                    placeholder="Project Name"
                    value={newProjectName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewProjectName(val);
                      if (!isIdentifierTouched) {
                        setNewProjectIdentifier(projectIdentifierSanitizer(val).substring(0, 5).toUpperCase());
                      }
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="new-project-identifier" className="text-xs text-tertiary mb-1 block">
                    Identifier (Key)
                  </label>
                  <input
                    id="new-project-identifier"
                    type="text"
                    className="w-full rounded-md border border-subtle-1 bg-layer-2 px-3 py-2 text-sm text-primary focus:border-accent-primary focus:outline-none uppercase font-mono tracking-wider"
                    placeholder="PRJ"
                    maxLength={5}
                    value={newProjectIdentifier}
                    onChange={(e) => {
                      setNewProjectIdentifier(e.target.value.toUpperCase());
                      setIsIdentifierTouched(true);
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="new-project-description" className="text-xs text-tertiary mb-1 block">
                    Description
                  </label>
                  <textarea
                    id="new-project-description"
                    className="w-full rounded-md border border-subtle-1 bg-layer-2 px-3 py-2 text-sm text-primary focus:border-accent-primary focus:outline-none"
                    placeholder="Project Description"
                    rows={3}
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                  />
                </div>

                {/* Feature Toggles */}
                <div className="pt-2 space-y-3 border-t border-subtle-1">
                  <h5 className="text-xs font-medium text-tertiary">Project Features</h5>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { key: "cycles", label: "Cycles", icon: CycleIcon, desc: "Timebox work into sprints" },
                      { key: "modules", label: "Modules", icon: ModuleIcon, desc: "Group work into sub-projects" },
                      { key: "views", label: "Views", icon: ViewsIcon, desc: "Save custom filters and sorts" },
                      { key: "pages", label: "Pages", icon: PageIcon, desc: "Create docs and notes" },
                      { key: "intake", label: "Intake", icon: IntakeIcon, desc: "Collect issues from outside" },
                    ].map((feature) => (
                      <div
                        key={feature.key}
                        className="flex items-center justify-between p-2 rounded-md bg-layer-2 border border-subtle-1"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-layer-1 text-tertiary">
                            <feature.icon className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary">{feature.label}</p>
                            <p className="text-xs text-tertiary">{feature.desc}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          value={projectFeatures[feature.key as keyof typeof projectFeatures]}
                          onChange={() =>
                            setProjectFeatures((prev) => ({
                              ...prev,
                              [feature.key]: !prev[feature.key as keyof typeof projectFeatures],
                            }))
                          }
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsCreatingProject(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleCreateProject()}
                    disabled={!newProjectName || !newProjectIdentifier || isCreatingProjectLoading}
                  >
                    {isCreatingProjectLoading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                    Create Project
                  </Button>
                </div>
              </div>
            </div>
          ) : activeTab === "import" ? (
            <>
              {/* Download Templates Section */}
              <div className="rounded-lg border border-subtle-1 bg-layer-1 p-4">
                <h4 className="text-sm font-medium text-primary mb-3">Download Templates</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Project Template */}
                  <div className="p-3 rounded-md border border-subtle-1 bg-layer-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-primary">Full Project</p>
                        <p className="text-xs text-tertiary mt-0.5">All entities in one file</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleDownloadFullTemplate}>
                        <Download className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Single Entity Templates */}
                  {(["state", "label", "module", "cycle", "page", "issue"] as ImportEntityType[]).map((type) => (
                    <div key={type} className="p-3 rounded-md border border-subtle-1 bg-layer-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {type === "issue" ? "Work Items" : `${type.charAt(0).toUpperCase() + type.slice(1)}s`} Only
                          </p>
                          <p className="text-xs text-tertiary mt-0.5">Single entity type</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleDownloadEntityTemplate(type)}>
                          <Download className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Section */}
              <div className="rounded-lg border border-subtle-1 bg-layer-1 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-primary">Upload Import File</h4>
                  {importMode === "single" && !parsedData && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-tertiary">Entity:</span>
                      <CustomSelect
                        value={importEntityType}
                        onChange={(val: ImportEntityType) => setImportEntityType(val)}
                        label={
                          importEntityType === "issue"
                            ? "Work Item"
                            : importEntityType.charAt(0).toUpperCase() + importEntityType.slice(1)
                        }
                        buttonClassName="text-xs h-7 px-2"
                        optionsClassName="w-32"
                      >
                        {(["issue", "state", "label", "module", "cycle", "page"] as ImportEntityType[]).map((type) => (
                          <CustomSelect.Option key={type} value={type}>
                            <span>{type === "issue" ? "Work Item" : type.charAt(0).toUpperCase() + type.slice(1)}</span>
                          </CustomSelect.Option>
                        ))}
                      </CustomSelect>
                    </div>
                  )}
                </div>

                {/* Drag & Drop Zone */}
                <div
                  role="button"
                  tabIndex={!canManageWorkspaceData || !selectedProjectId ? -1 : 0}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? "border-accent-primary bg-accent-subtle"
                      : "border-subtle-1 hover:border-accent-primary/50 hover:bg-layer-2"
                  } ${!canManageWorkspaceData || !selectedProjectId ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={!canManageWorkspaceData || !selectedProjectId}
                  />
                  <FileUp className="size-8 mx-auto mb-2 text-tertiary" />
                  <p className="text-sm font-medium text-primary">
                    {isDragOver ? "Drop file here" : "Drag & drop JSON file"}
                  </p>
                  <p className="text-xs text-tertiary mt-1">or click to browse</p>
                </div>

                {/* Uploaded File Info */}
                {uploadedFile && parsedData && (
                  <div className="p-3 rounded-md border border-subtle-1 bg-layer-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-md bg-accent-subtle flex items-center justify-center">
                          <FileUp className="size-4 text-accent-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">{uploadedFile.name}</p>
                          <p className="text-xs text-tertiary">
                            {parsedData.mode === "full" ? "Full project import" : "Single entity import"} •{" "}
                            {getImportSummary()}
                          </p>
                        </div>
                      </div>
                      <button onClick={clearUpload} className="p-1.5 rounded-md hover:bg-layer-3 transition-colors">
                        <X className="size-4 text-tertiary" />
                      </button>
                    </div>

                    {/* Import Button */}
                    <div className="mt-3 pt-3 border-t border-subtle-1 flex items-center gap-3">
                      {isImporting ? (
                        <div className="w-full space-y-2">
                          <div className="flex justify-between text-xs text-tertiary">
                            <span>Importing... {importProgress}%</span>
                            <span className="truncate max-w-[200px]">{currentImportItem}</span>
                          </div>
                          <div className="h-2 w-full bg-layer-3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-primary transition-all duration-300"
                              style={{ width: `${importProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => void handleImport()}
                            disabled={isImporting || !selectedProjectId}
                          >
                            <Upload className="size-3.5" />
                            Import Data
                          </Button>
                          {!selectedProjectId && <span className="text-xs text-warning-primary">Select a project</span>}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Import Results */}
                {importResult && (
                  <div
                    className={`p-3 rounded-md ${importResult.failed > 0 ? "bg-warning-subtle" : "bg-success-subtle-1"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {importResult.failed > 0 ? (
                          <AlertCircle className="size-4 text-warning-primary" />
                        ) : (
                          <CheckCircle2 className="size-4 text-success-primary" />
                        )}
                        <span className="text-sm font-medium text-primary">
                          {importResult.success} succeeded, {importResult.failed} failed
                        </span>
                      </div>
                      {importResult.errors.length > 0 && (
                        <span className="text-xs text-tertiary">{importResult.errors.length} error(s)</span>
                      )}
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-y-auto space-y-1 border border-subtle-1 rounded p-2 bg-layer-1">
                        {importResult.errors.map((err, i) => (
                          <p key={i} className="text-xs text-danger-primary font-mono break-all">
                            {i + 1}. {err}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Import Order */}
              <div className="rounded-lg border border-subtle-1 bg-layer-1 p-4">
                <h4 className="text-sm font-medium text-primary mb-3">Import Order</h4>
                <div className="flex flex-wrap gap-2">
                  {IMPORT_ORDER.map((item) => (
                    <div key={item.step} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-layer-2">
                      <span className="size-5 rounded-full bg-accent-primary text-on-color flex items-center justify-center text-xs font-medium">
                        {item.step}
                      </span>
                      <span className="text-xs font-medium text-primary">{item.entity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Schema Reference */}
              <div className="rounded-lg border border-subtle-1 bg-layer-1 overflow-hidden">
                <div className="p-4 border-b border-subtle-1">
                  <h4 className="text-sm font-medium text-primary">API Schema Reference</h4>
                </div>
                <div className="divide-y divide-subtle-1">
                  {SCHEMA_SECTIONS.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-layer-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedSections.has(section.id) ? (
                            <ChevronDown className="size-4 text-tertiary" />
                          ) : (
                            <ChevronRight className="size-4 text-tertiary" />
                          )}
                          <span className="text-sm font-medium text-primary">{section.title}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-layer-3 text-tertiary">
                            {section.method}
                          </span>
                        </div>
                        <span className="text-xs text-tertiary hidden sm:block">{section.description}</span>
                      </button>
                      {expandedSections.has(section.id) && (
                        <div className="px-4 pb-4 space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-tertiary">Endpoint</span>
                              <button
                                onClick={() => void handleCopyEndpoint(section.endpoint)}
                                className="text-xs text-link-primary hover:underline flex items-center gap-1"
                              >
                                <Copy className="size-3" /> Copy
                              </button>
                            </div>
                            <code className="block text-xs bg-layer-2 p-2 rounded font-mono text-secondary">
                              {section.method} {getEndpointWithParams(section.endpoint)}
                            </code>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-tertiary">Example</span>
                              <button
                                onClick={() => void handleCopyJson(section.example)}
                                className="text-xs text-link-primary hover:underline flex items-center gap-1"
                              >
                                <Copy className="size-3" /> Copy
                              </button>
                            </div>
                            <pre className="text-xs bg-layer-2 p-2 rounded font-mono text-secondary overflow-x-auto">
                              {JSON.stringify(section.example, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-subtle-1 bg-layer-1 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Download className="size-4 text-tertiary" />
                <div>
                  <p className="text-sm font-medium text-primary">Export Project Data</p>
                  <p className="text-xs text-tertiary">Export as CSV, JSON, or XLSX</p>
                </div>
              </div>
              {effectiveWorkspaceSlug ? (
                <ExportForm workspaceSlug={effectiveWorkspaceSlug} provider={null} mutateServices={() => undefined} />
              ) : (
                <p className="text-sm text-tertiary p-3 bg-layer-2 rounded">Select a workspace to export</p>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalCore>
  );
});
