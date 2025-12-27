"use client";
import { useState } from "react";
import { observer } from "mobx-react";
import { Database, Shapes } from "lucide-react";
import { useParams } from "next/navigation";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { HomeIcon } from "@plane/propel/icons";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { BulkImportExportModal } from "@/components/import-export/bulk-import-export-modal";
// hooks
import { useHome } from "@/hooks/store/use-home";
import { useUserPermissions } from "@/hooks/store/user";

export const WorkspaceDashboardHeader = observer(function WorkspaceDashboardHeader() {
  const { workspaceSlug } = useParams();
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { toggleWidgetSettings } = useHome();
  const { allowPermissions } = useUserPermissions();

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const canManageWorkspaceData = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE,
    workspaceSlug?.toString()
  );

  return (
    <>
      <Header>
        <Header.LeftItem>
          <div className="flex items-center gap-2">
            <Breadcrumbs>
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink label={t("home.title")} icon={<HomeIcon className="h-4 w-4 text-tertiary" />} />
                }
              />
            </Breadcrumbs>
          </div>
        </Header.LeftItem>
        <Header.RightItem>
          <div className="flex items-center gap-2">
            {canManageWorkspaceData ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsBulkModalOpen(true)}
                className="my-auto mb-0"
                prependIcon={<Database />}
              >
                <div className="hidden sm:hidden md:block">Bulk import/export</div>
                <div className="block sm:block md:hidden">Import/Export</div>
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => toggleWidgetSettings(true)}
              className="my-auto mb-0"
              prependIcon={<Shapes />}
            >
              <div className="hidden sm:hidden md:block">{t("home.manage_widgets")}</div>
            </Button>
          </div>
        </Header.RightItem>
      </Header>

      <BulkImportExportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        workspaceSlug={workspaceSlug?.toString()}
      />
    </>
  );
});
