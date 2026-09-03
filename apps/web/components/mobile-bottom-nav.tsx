"use client";

import { buildNavUrl, cn, type MultiSelectOption } from "@transparencia/ui";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  PieChart,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import posthog from "posthog-js";
import type React from "react";

export interface PortalPageItem {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number | string;
  }>;
}

export const PORTAL_PAGES: readonly PortalPageItem[] = [
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
    id: "orcamento",
    path: "/orcamento",
    label: "Execução Orçamentária",
    shortLabel: "Orçamento",
    icon: PieChart,
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
  {
    id: "pessoal",
    path: "/pessoal",
    label: "Pessoal",
    shortLabel: "Pessoal",
    icon: Users,
  },
  {
    id: "saude",
    path: "/saude",
    label: "Saúde",
    shortLabel: "Saúde",
    icon: HeartPulse,
  },
  {
    id: "caprem",
    path: "/caprem",
    label: "CAPREM",
    shortLabel: "CAPREM",
    icon: Landmark,
  },
] as const;

export function resolveCurrentPageIndex(
  pathname: string | null,
  portalSlug?: string,
): number {
  if (!pathname) {
    return 0;
  }

  const effectiveSlug = portalSlug ?? "porciuncula_prefeitura";
  const slugPrefix = `/${effectiveSlug}`;

  const cleanPath =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (cleanPath === "/" || cleanPath === slugPrefix) {
    return 0;
  }

  for (let i = 1; i < PORTAL_PAGES.length; i++) {
    const page = PORTAL_PAGES[i];
    const fullPagePath = `${slugPrefix}${page.path}`;
    if (
      cleanPath === fullPagePath ||
      cleanPath === page.path ||
      cleanPath.startsWith(`${fullPagePath}/`) ||
      cleanPath.startsWith(`${page.path}/`)
    ) {
      return i;
    }
  }

  return 0;
}

export function getCivicStepperPages(currentIndex: number) {
  const boundedIndex = Math.max(
    0,
    Math.min(currentIndex, PORTAL_PAGES.length - 1),
  );
  const previousPage = boundedIndex > 0 ? PORTAL_PAGES[boundedIndex - 1] : null;
  const nextPage =
    boundedIndex < PORTAL_PAGES.length - 1
      ? PORTAL_PAGES[boundedIndex + 1]
      : null;
  const isFirst = boundedIndex === 0;
  const isLast = boundedIndex === PORTAL_PAGES.length - 1;

  return {
    currentPage: PORTAL_PAGES[boundedIndex],
    previousPage,
    nextPage,
    isFirst,
    isLast,
  };
}

export interface MobileBottomNavProps {
  portalSlug?: string;
  anoInicial?: number;
  entidades?: MultiSelectOption[] | string[];
}

export function MobileBottomNav({
  portalSlug = "porciuncula_prefeitura",
  anoInicial,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const currentYearNum = new Date().getFullYear();
  const currentYear = String(currentYearNum);

  const [ano, setAno] = useQueryState(
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

  const minYear = anoInicial ?? 2021;
  const maxYear = currentYearNum;
  const years = Array.from(
    { length: Math.max(1, maxYear - minYear + 1) },
    (_, i) => String(maxYear - i),
  );

  const currentIndex = resolveCurrentPageIndex(pathname, portalSlug);
  const { previousPage, nextPage, isFirst, isLast } =
    getCivicStepperPages(currentIndex);

  const handleExerciceChange = (val: string) => {
    posthog.capture("year_filter_changed", {
      selected_year: val,
      previous_year: ano,
      portal_slug: portalSlug,
    });
    setAno(val);
  };

  const previousHref = previousPage
    ? buildNavUrl({
        path: previousPage.path,
        slug: portalSlug,
        exercice: ano,
        entidades: selectedEntidades,
      })
    : "#";

  const nextHref = nextPage
    ? buildNavUrl({
        path: nextPage.path,
        slug: portalSlug,
        exercice: ano,
        entidades: selectedEntidades,
      })
    : "#";

  const homeHref = buildNavUrl({
    path: "/",
    slug: portalSlug,
    exercice: ano,
    entidades: selectedEntidades,
  });

  return (
    <nav
      aria-label="Navegação móvel contínua"
      className="fixed right-0 bottom-0 left-0 z-50 border-borderLine border-t bg-white/95 px-3 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-1.5">
        {/* Botão Anterior */}
        <div className="flex min-w-0 flex-1 items-center justify-start">
          {isFirst || !previousPage ? (
            <span
              aria-disabled="true"
              className="flex min-h-[44px] w-full cursor-not-allowed touch-manipulation select-none items-center justify-start gap-1 rounded-lg px-2 py-1.5 font-medium text-subtleText text-xs opacity-40"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">Anterior</span>
            </span>
          ) : (
            <Link
              href={previousHref}
              aria-label={`Página anterior: ${previousPage.label}`}
              className="flex min-h-[44px] w-full touch-manipulation items-center justify-start gap-1 rounded-lg px-2 py-1.5 font-medium text-ink text-xs transition-colors hover:text-[#1d64d8] active:bg-gray-100"
            >
              <ChevronLeft
                className="h-4 w-4 shrink-0 text-mutedText"
                strokeWidth={1.8}
              />
              <span className="truncate">{previousPage.shortLabel}</span>
            </Link>
          )}
        </div>

        {/* Bloco Central: Início + Seletor de Ano */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={homeHref}
            aria-label="Visão Geral"
            className={cn(
              "flex min-h-[44px] touch-manipulation flex-col items-center justify-center rounded-lg px-2 py-1 font-semibold text-[11px] transition-colors",
              isFirst
                ? "text-[oklch(0.55_0.11_250)]"
                : "text-mutedText hover:text-ink active:bg-gray-100",
            )}
          >
            <LayoutDashboard
              className="h-4 w-4"
              strokeWidth={isFirst ? 2 : 1.6}
            />
            <span>Início</span>
          </Link>

          <div className="relative flex items-center">
            <label htmlFor="mobile-bottom-nav-year" className="sr-only">
              Selecionar Exercício
            </label>
            <select
              id="mobile-bottom-nav-year"
              aria-label="Selecionar Exercício"
              value={ano}
              onChange={(e) => handleExerciceChange(e.target.value)}
              className="min-h-[44px] cursor-pointer touch-manipulation appearance-none rounded-md border border-borderLine bg-white py-1 pr-6 pl-2 font-semibold text-ink text-xs shadow-xs transition-colors hover:border-gray-400 focus:border-[#1d64d8] focus:outline-none"
            >
              {years.map((yr) => (
                <option
                  key={yr}
                  value={yr}
                  className="bg-white text-ink text-sm"
                >
                  {yr}
                </option>
              ))}
            </select>
            <ChevronDown
              strokeWidth={2}
              className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-mutedText"
            />
          </div>
        </div>

        {/* Botão Próximo */}
        <div className="flex min-w-0 flex-1 items-center justify-end">
          {isLast || !nextPage ? (
            <span
              aria-disabled="true"
              className="flex min-h-[44px] w-full cursor-not-allowed touch-manipulation select-none items-center justify-end gap-1 rounded-lg px-2 py-1.5 font-medium text-subtleText text-xs opacity-40"
            >
              <span className="truncate">Próximo</span>
              <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            </span>
          ) : (
            <Link
              href={nextHref}
              aria-label={`Próxima página: ${nextPage.label}`}
              className="flex min-h-[44px] w-full touch-manipulation items-center justify-end gap-1 rounded-lg px-2 py-1.5 font-medium text-ink text-xs transition-colors hover:text-[#1d64d8] active:bg-gray-100"
            >
              <span className="truncate">{nextPage.shortLabel}</span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-mutedText"
                strokeWidth={1.8}
              />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
