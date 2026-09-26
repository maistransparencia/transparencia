"use client";

import { type MultiSelectOption, Sidebar } from "@transparencia/ui";
import { parseAsString, useQueryState } from "nuqs";
import posthog from "posthog-js";
import { EntidadeSelectCompact } from "@/components/entidade-select-compact";
import { useMobileNav } from "@/components/mobile-nav-context";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { PwaInstallButton } from "@/components/pwa-installer";

interface SidebarWrapperProps {
  portalName?: string;
  stateUF?: string;
  portalTitle?: string;
  anoInicial?: number;
  lastExtractionDate?: string;
  officialPortalUrl?: string;
  brasaoAsset?: string;
  entidades?: MultiSelectOption[];
  portalSlug?: string;
  radarAlertsCountByYear?: Record<number, number>;
  radarAlertCount?: number;
}

export function SidebarWrapper({
  portalName,
  stateUF,
  portalTitle,
  anoInicial,
  lastExtractionDate,
  officialPortalUrl,
  brasaoAsset,
  entidades,
  portalSlug,
  radarAlertsCountByYear,
  radarAlertCount,
}: SidebarWrapperProps) {
  const { isMenuOpen, setIsMenuOpen } = useMobileNav();
  const currentYear = String(new Date().getFullYear());
  const [ano, setAno] = useQueryState(
    "ano",
    parseAsString.withDefault(currentYear).withOptions({ shallow: false }),
  );
  const [entidadesParam, setEntidadesParam] = useQueryState(
    "entidades",
    parseAsString.withOptions({ shallow: false }),
  );

  const selectedEntidades = entidadesParam
    ? entidadesParam.split(",").filter(Boolean)
    : [];

  const handleExerciceChange = (val: string) => {
    posthog.capture("year_filter_changed", {
      selected_year: val,
      previous_year: ano,
      portal_slug: portalSlug,
    });
    setAno(val);
  };

  const handleEntidadesChange = (ids: string[]) => {
    posthog.capture("entity_filter_changed", {
      selected_count: ids.length,
      portal_slug: portalSlug,
    });
    if (ids.length === 0) {
      setEntidadesParam(null);
    } else {
      setEntidadesParam(ids.join(","));
    }
  };

  const activeRadarAlertCount = (() => {
    if (radarAlertsCountByYear) {
      const yearNum = Number.parseInt(ano, 10);
      if (
        Number.isFinite(yearNum) &&
        radarAlertsCountByYear[yearNum] !== undefined
      ) {
        return radarAlertsCountByYear[yearNum];
      }
      return 0;
    }
    return radarAlertCount ?? 0;
  })();

  return (
    <Sidebar
      portalName={portalName}
      stateUF={stateUF}
      portalTitle={portalTitle}
      anoInicial={anoInicial}
      brasaoAsset={brasaoAsset}
      entidades={entidades}
      portalSlug={portalSlug}
      selectedExercice={ano}
      onExerciceChange={handleExerciceChange}
      selectedEntidades={selectedEntidades}
      onEntidadesChange={handleEntidadesChange}
      pushNotificationSlot={
        <PushNotificationSettings portalSlug={portalSlug} />
      }
      pwaInstallSlot={<PwaInstallButton variant="sidebar" />}
      mobileHeaderRightSlot={
        entidades && entidades.length > 0 ? (
          <EntidadeSelectCompact
            entidades={entidades}
            selectedEntidades={selectedEntidades}
            onChange={handleEntidadesChange}
          />
        ) : undefined
      }
      isMobileOpen={isMenuOpen}
      onMobileOpenChange={setIsMenuOpen}
      radarAlertCount={activeRadarAlertCount}
    />
  );
}
