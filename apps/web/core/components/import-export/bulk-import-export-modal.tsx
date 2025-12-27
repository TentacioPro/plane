"use client";

import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Download, Upload } from "lucide-react";
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

export const BulkImportExportModal = observer(function BulkImportExportModal(props: TBulkImportExportModalProps) {
  const { isOpen, onClose, workspaceSlug } = props;
  const { workspaceSlug: routeWorkspaceSlug } = useParams();
  const effectiveWorkspaceSlug = workspaceSlug || (routeWorkspaceSlug?.toString() ?? "");
  const { t } = useTranslation();

  // stores
  const { workspaceProjectIds, getProjectById } = useProject();
  const { allowPermissions } = useUserPermissions();

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

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

  const apiEndpoint = useMemo(() => {
    if (!effectiveWorkspaceSlug || !selectedProjectId) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/workspaces/${effectiveWorkspaceSlug}/projects/${selectedProjectId}/issues/`;
  }, [effectiveWorkspaceSlug, selectedProjectId]);

  const handleCopyEndpoint = async () => {
    if (!apiEndpoint) return;

    try {
      await navigator.clipboard.writeText(apiEndpoint);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("copied"),
        message: t("common.copied_to_clipboard"),
      });
    } catch (_error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: t("workspace_settings.settings.exports.modal.toasts.error.message"),
      });
    }
  };

  const handleDownloadTemplate = () => {
    const rows = [IMPORT_TEMPLATE_HEADERS.join(","),
      `"Migrate dashboard","<p>Move widgets to the new layout</p>",3,"<state-uuid>","[\\"<assignee-uuid>\\"]","[\\"<label-uuid>\\"]",,${new Date()
        .toISOString()
        .slice(0, 10)},${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)}`,
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

  return (
    <ModalCore
      isOpen={isOpen}
      handleClose={onClose}
      width={EModalWidth.XXL}
      position={EModalPosition.TOP}
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-18 font-medium text-primary">Bulk import & export</h3>
            <p className="text-13 text-secondary">
              Manage workspace data securely. Admins and Members can export issues and prep imports using the documented payload shape.
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={onClose} className="w-full sm:w-auto">
            {t("close")}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border-base bg-surface-1 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Download className="h-4 w-4 text-tertiary" />
              <div>
                <div className="text-15 font-medium text-primary">Export project data</div>
                <p className="text-12 text-secondary">
                  Queue a CSV, JSON, or XLSX export. Results are delivered via the existing export worker and stored in MinIO/export history.
                </p>
              </div>
            </div>
            {effectiveWorkspaceSlug ? (
              <ExportForm workspaceSlug={effectiveWorkspaceSlug} mutateServices={() => undefined} />
            ) : (
              <p className="rounded-md bg-surface-2 p-3 text-13 text-secondary">
                Select a workspace to configure exports.
              </p>
            )}
            <p className="mt-3 text-12 text-secondary">
              Exports respect project-level permissions; only projects where you have create access appear in the list.
            </p>
          </div>

          <div className="rounded-lg border border-border-base bg-surface-1 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-tertiary" />
              <div>
                <div className="text-15 font-medium text-primary">Prepare bulk import</div>
                <p className="text-12 text-secondary">
                  Use the standard issue create API per project. Build a CSV/JSON with the template below and post it with your API token.
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <div className="text-13 font-medium text-secondary">Target project</div>
              <CustomSearchSelect
                value={selectedProjectId ? [selectedProjectId] : []}
                onChange={(values: string[]) => setSelectedProjectId(values?.[0])}
                options={projectOptions}
                input
                multiple={false}
                label={
                  selectedProjectId ? getProjectById(selectedProjectId)?.name ?? "Select project" : "Select project"
                }
                placement="bottom-end"
                optionsClassName="max-w-48 sm:max-w-[532px]"
                disabled={!canManageWorkspaceData || projectOptions.length === 0}
              />
              {!canManageWorkspaceData ? (
                <p className="text-12 text-accent-warning">
                  Only workspace Admins or Members can prepare imports.
                </p>
              ) : null}
            </div>

            <div className="rounded-md bg-surface-2 p-3">
              <div className="mb-2 text-12 font-medium text-primary">API endpoint</div>
              <div className="break-all rounded border border-border-base bg-surface-1 px-3 py-2 text-12 font-mono text-secondary">
                {apiEndpoint || "Select a project to view the endpoint"}
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void handleCopyEndpoint();
                  }}
                  disabled={!apiEndpoint || !canManageWorkspaceData}
                >
                  Copy endpoint
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={!canManageWorkspaceData}
                >
                  Download CSV template
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-12 font-medium text-primary">Payload example (per issue)</div>
              <pre className="overflow-auto rounded-md bg-surface-2 p-3 text-12 text-secondary">
{`POST ${apiEndpoint || "/api/workspaces/:slug/projects/:project_id/issues/"}
Authorization: Bearer <api-token>
Content-Type: application/json

{
  "name": "Migrate dashboard",
  "description_html": "<p>Move widgets to the new layout</p>",
  "priority": 3,
  "state_id": "<state-uuid>",
  "assignee_ids": ["<user-uuid>"],
  "label_ids": ["<label-uuid>"],
  "parent_id": null,
  "start_date": "2025-12-28",
  "target_date": "2026-01-05"
}`}
              </pre>
              <p className="text-12 text-secondary">
                Import requests run under your API token and project role; validation errors will be returned per request.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModalCore>
  );
});
