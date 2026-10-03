"use client";

import {
  type MultiSelectOption,
  type PortalOption,
  type PrevidenciaNavConfig,
  resolvePortalSlug,
  Sidebar,
} from "@transparencia/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import posthog from "posthog-js";
import { useEffect } from "react";
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
  portais?: PortalOption[];
  portalSlug?: string;
  radarAlertsByPortal?: Record<string, Record<number, number>>;
  radarAlertsCountByYear?: Record<number, number>;
  radarAlertCount?: number;
  entidadesByPortal?: Record<string, MultiSelectOption[]>;
  previdencia?: PrevidenciaNavConfig;
}

export function SidebarWrapper({
  portalName,
  stateUF,
  portalTitle,
  anoInicial,
  lastExtractionDate: _lastExtractionDate,
  officialPortalUrl: _officialPortalUrl,
  brasaoAsset,
  entidades,
  portalSlug,
  portais,
  radarAlertsByPortal,
  radarAlertsCountByYear,
  radarAlertCount,
  entidadesByPortal,
  previdencia,
}: SidebarWrapperProps) {
  const { isMenuOpen, setIsMenuOpen } = useMobileNav();
  const router = useRouter();
  const pathname = usePathname();
  const isRootPage = !pathname || pathname === "/";
  const searchParams = useSearchParams();
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

  const segments = (pathname || "").split("/").filter(Boolean);
  const activePortalSlug = (() => {
    if (segments.length > 0) {
      const firstSegment = segments[0];
      const match = portais?.find(
        (p) =>
          p.portalSlug === firstSegment ||
          p.portalSlug === resolvePortalSlug(firstSegment),
      );
      if (match) return match.portalSlug;
    }
    return portalSlug || "porciuncula_prefeitura";
  })();

  const activePortal = portais?.find((p) => p.portalSlug === activePortalSlug);
  const effectivePortalName = activePortal?.displayName || portalName;
  const effectiveStateUF = activePortal?.uf || stateUF;
  const effectiveAnoInicial = activePortal?.anoInicial ?? anoInicial;
  const effectiveBrasaoAsset = activePortal?.brasaoAsset || brasaoAsset;
  const effectivePrevidencia = activePortal?.previdencia ?? previdencia;
  const effectivePortalTitle = effectivePortalName
    ? `Contas da ${effectivePortalName}`
    : portalTitle;

  useEffect(() => {
    if (activePortalSlug && !isRootPage) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("preferred_portal", activePortalSlug);
          // biome-ignore lint/suspicious/noDocumentCookie: cookie de preferencia do portal
          document.cookie = `preferred_portal=${activePortalSlug}; path=/; max-age=31536000; SameSite=Lax`;
        }
      } catch {}
    }
  }, [activePortalSlug, isRootPage]);

  const handleExerciceChange = (val: string) => {
    posthog.capture("year_filter_changed", {
      selected_year: val,
      previous_year: ano,
      portal_slug: activePortalSlug,
    });
    setAno(val);
  };

  const handleEntidadesChange = (ids: string[]) => {
    posthog.capture("entity_filter_changed", {
      selected_count: ids.length,
      portal_slug: activePortalSlug,
    });
    if (ids.length === 0) {
      setEntidadesParam(null);
    } else {
      setEntidadesParam(ids.join(","));
    }
  };

  const handlePortalChange = (newPortalSlug: string) => {
    if (!newPortalSlug || newPortalSlug === activePortalSlug) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("preferred_portal", newPortalSlug);
        // biome-ignore lint/suspicious/noDocumentCookie: cookie de preferencia do portal
        document.cookie = `preferred_portal=${newPortalSlug}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {}

    posthog.capture("portal_changed", {
      from_portal: activePortalSlug,
      to_portal: newPortalSlug,
    });

    const isStaticRootPage =
      pathname === "/termos" ||
      pathname === "/privacidade" ||
      pathname?.startsWith("/termos") ||
      pathname?.startsWith("/privacidade");

    let newPath: string;

    if (isStaticRootPage || segments.length === 0) {
      newPath = `/${newPortalSlug}`;
    } else {
      const currentSegment = segments[0];
      const isKnownPortal =
        currentSegment === activePortalSlug ||
        portais?.some((p) => p.portalSlug === currentSegment);

      if (isKnownPortal) {
        const isPrevidenciaSubroute = segments[1] === "previdencia";
        const targetPortal = portais?.find(
          (p) => p.portalSlug === newPortalSlug,
        );
        if (
          isPrevidenciaSubroute &&
          targetPortal?.previdencia?.habilitado === false
        ) {
          newPath = `/${newPortalSlug}`;
        } else {
          segments[0] = newPortalSlug;
          newPath = `/${segments.join("/")}`;
        }
      } else {
        newPath = `/${newPortalSlug}`;
      }
    }

    const queryYear = searchParams?.get("ano");
    const targetUrl = queryYear ? `${newPath}?ano=${queryYear}` : newPath;
    router.push(targetUrl);
  };

  const effectiveEntidades =
    entidadesByPortal?.[activePortalSlug] ?? entidades ?? [];

  const activeRadarAlertCount = (() => {
    const alertsMap =
      radarAlertsByPortal?.[activePortalSlug] ?? radarAlertsCountByYear;
    if (alertsMap) {
      const yearNum = Number.parseInt(ano, 10);
      if (Number.isFinite(yearNum) && alertsMap[yearNum] !== undefined) {
        return alertsMap[yearNum];
      }
      return 0;
    }
    return radarAlertCount ?? 0;
  })();

  if (isRootPage) {
    return null;
  }

  return (
    <Sidebar
      portalName={effectivePortalName}
      stateUF={effectiveStateUF}
      portalTitle={effectivePortalTitle}
      anoInicial={effectiveAnoInicial}
      brasaoAsset={effectiveBrasaoAsset}
      entidades={effectiveEntidades}
      portalSlug={activePortalSlug}
      portais={portais}
      onPortalChange={handlePortalChange}
      selectedExercice={ano}
      onExerciceChange={handleExerciceChange}
      selectedEntidades={selectedEntidades}
      onEntidadesChange={handleEntidadesChange}
      pushNotificationSlot={
        <PushNotificationSettings portalSlug={activePortalSlug} />
      }
      pwaInstallSlot={<PwaInstallButton variant="sidebar" />}
      mobileHeaderRightSlot={
        effectiveEntidades && effectiveEntidades.length > 0 ? (
          <EntidadeSelectCompact
            entidades={effectiveEntidades}
            selectedEntidades={selectedEntidades}
            onChange={handleEntidadesChange}
          />
        ) : undefined
      }
      isMobileOpen={isMenuOpen}
      onMobileOpenChange={setIsMenuOpen}
      radarAlertCount={activeRadarAlertCount}
      previdencia={effectivePrevidencia}
    />
  );
}
