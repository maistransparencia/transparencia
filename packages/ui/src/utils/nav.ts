import { GraduationCap, HardHat, HeartPulse, Landmark } from "lucide-react";
import type { ComponentType } from "react";

export interface BuildNavUrlParams {
  path: string;
  slug?: string;
  exercice?: string;
  entidades?: string[];
}

export function buildNavUrl({
  path,
  slug,
  exercice,
  entidades,
}: BuildNavUrlParams): string {
  const slugPrefix = slug ? `/${slug}` : "";
  const basePath = path === "/" ? slugPrefix || "/" : `${slugPrefix}${path}`;

  const params = new URLSearchParams();
  if (exercice) {
    params.set("ano", exercice);
  }
  if (entidades && entidades.length > 0) {
    params.set("entidades", entidades.join(","));
  }
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export const PORTAL_ALIASES: Record<string, string> = {
  porciuncula: "porciuncula_prefeitura",
  "porciuncula-prefeitura": "porciuncula_prefeitura",
  natividade: "natividade_prefeitura",
  "natividade-prefeitura": "natividade_prefeitura",
};

export function resolvePortalSlug(slug?: string | null): string {
  if (!slug || typeof slug !== "string") return "porciuncula_prefeitura";
  const normalized = slug.trim().toLowerCase();
  return PORTAL_ALIASES[normalized] || normalized;
}

export interface TemaNavItem {
  id: string;
  name: string;
  shortName: string;
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

export interface BuildTemasNavItemsParams {
  previdencia?: { habilitado: boolean; sigla?: string };
}

/** Fonte única dos temas (sidebar e bottom bar). */
export function buildTemasNavItems({
  previdencia,
}: BuildTemasNavItemsParams = {}): TemaNavItem[] {
  const isPrevidenciaEnabled = previdencia ? previdencia.habilitado : true;
  const temasBase: TemaNavItem[] = [
    {
      id: "saude",
      name: "Saúde",
      shortName: "Saúde",
      href: "/saude",
      icon: HeartPulse,
    },
    {
      id: "educacao",
      name: "Educação",
      shortName: "Educação",
      href: "/educacao",
      icon: GraduationCap,
    },
    {
      id: "obras",
      name: "Obras Públicas",
      shortName: "Obras",
      href: "/obras",
      icon: HardHat,
    },
  ];
  const previdenciaItem: TemaNavItem[] = isPrevidenciaEnabled
    ? [
        {
          id: "previdencia",
          name: previdencia?.sigla || "Previdência",
          shortName: previdencia?.sigla || "Previdência",
          href: "/previdencia",
          icon: Landmark,
        },
      ]
    : [];
  return [...temasBase, ...previdenciaItem];
}
