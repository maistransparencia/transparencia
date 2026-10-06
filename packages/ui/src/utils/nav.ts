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
