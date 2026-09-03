"use client";

import { buildNavUrl, cn, type MultiSelectOption } from "@transparencia/ui";
import {
  FileText,
  LayoutDashboard,
  Menu,
  Receipt,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import type React from "react";
import { useMobileNav } from "./mobile-nav-context";

export interface PortalTabItem {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number | string;
  }>;
}

export const PRIMARY_NAV_TABS: readonly PortalTabItem[] = [
  {
    id: "visao-geral",
    path: "/",
    label: "Visão Geral",
    shortLabel: "Início",
    icon: LayoutDashboard,
  },
  {
    id: "receitas",
    path: "/receitas",
    label: "Receitas",
    shortLabel: "Receitas",
    icon: TrendingUp,
  },
  {
    id: "despesas",
    path: "/despesas",
    label: "Despesas Detalhadas",
    shortLabel: "Despesas",
    icon: Receipt,
  },
  {
    id: "licitacoes",
    path: "/licitacoes",
    label: "Licitações e Contratos",
    shortLabel: "Licitações",
    icon: FileText,
  },
] as const;

export function isTabActive(
  pathname: string | null,
  tabPath: string,
  portalSlug?: string,
): boolean {
  if (!pathname) {
    return tabPath === "/";
  }

  const effectiveSlug = portalSlug ?? "porciuncula_prefeitura";
  const slugPrefix = `/${effectiveSlug}`;

  const cleanPath =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (tabPath === "/") {
    return cleanPath === "/" || cleanPath === slugPrefix;
  }

  const fullTabPath = `${slugPrefix}${tabPath}`;
  return (
    cleanPath === fullTabPath ||
    cleanPath === tabPath ||
    cleanPath.startsWith(`${fullTabPath}/`) ||
    cleanPath.startsWith(`${tabPath}/`)
  );
}

export function resolveActiveTabIndex(
  pathname: string | null,
  portalSlug?: string,
): number {
  if (!pathname) {
    return 0;
  }

  for (let i = 0; i < PRIMARY_NAV_TABS.length; i++) {
    if (isTabActive(pathname, PRIMARY_NAV_TABS[i].path, portalSlug)) {
      return i;
    }
  }

  // Se a rota ativa não pertencer às 4 abas primárias, retorna 4 ("Mais")
  return PRIMARY_NAV_TABS.length;
}

export interface MobileBottomNavProps {
  portalSlug?: string;
  anoInicial?: number;
  entidades?: MultiSelectOption[] | string[];
}

export function MobileBottomNav({
  portalSlug = "porciuncula_prefeitura",
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { isMenuOpen, toggleMenu } = useMobileNav();
  const currentYear = String(new Date().getFullYear());

  const [ano] = useQueryState(
    "ano",
    parseAsString.withDefault(currentYear).withOptions({ shallow: false }),
  );
  const [entidadesParam] = useQueryState(
    "entidades",
    parseAsString.withOptions({ shallow: false }),
  );

  const selectedEntidades = entidadesParam
    ? entidadesParam.split(",").filter(Boolean)
    : [];

  const activeIndex = resolveActiveTabIndex(pathname, portalSlug);
  const isMoreActive = activeIndex === PRIMARY_NAV_TABS.length || isMenuOpen;

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed right-0 bottom-0 left-0 z-30 border-borderLine border-t bg-white/95 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-1">
        {PRIMARY_NAV_TABS.map((tab, index) => {
          const isActive = !isMenuOpen && activeIndex === index;
          const Icon = tab.icon;
          const href = buildNavUrl({
            path: tab.path,
            slug: portalSlug,
            exercice: ano,
            entidades: selectedEntidades,
          });

          return (
            <Link
              key={tab.id}
              href={href}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[48px] flex-1 touch-manipulation flex-col items-center justify-center rounded-lg px-1 py-1 text-center transition-colors",
                isActive
                  ? "bg-[oklch(0.55_0.11_250)]/10 font-bold text-[oklch(0.55_0.11_250)]"
                  : "font-medium text-mutedText hover:text-ink active:bg-gray-100",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform",
                  isActive && "scale-110 text-[oklch(0.55_0.11_250)]",
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className="mt-0.5 block truncate font-medium text-[10px] leading-tight">
                {tab.shortLabel}
              </span>
            </Link>
          );
        })}

        {/* 5ª Aba: Mais (abre o menu lateral completo) */}
        <button
          type="button"
          onClick={toggleMenu}
          aria-label={
            isMenuOpen ? "Fechar menu de seções" : "Mais opções e seções"
          }
          aria-expanded={isMenuOpen}
          className={cn(
            "flex min-h-[48px] flex-1 touch-manipulation flex-col items-center justify-center rounded-lg px-1 py-1 text-center transition-colors",
            isMoreActive
              ? "bg-[oklch(0.55_0.11_250)]/10 font-bold text-[oklch(0.55_0.11_250)]"
              : "font-medium text-mutedText hover:text-ink active:bg-gray-100",
          )}
        >
          <Menu
            className={cn(
              "h-5 w-5 shrink-0 transition-transform",
              isMoreActive && "scale-110 text-[oklch(0.55_0.11_250)]",
            )}
            strokeWidth={isMoreActive ? 2.2 : 1.8}
          />
          <span className="mt-0.5 block truncate font-medium text-[10px] leading-tight">
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
}
