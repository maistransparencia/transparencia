import { sql } from "kysely";
import { db } from "../client";

export interface PrevidenciaConfig {
  habilitado: boolean;
  sigla: string;
  nome: string;
  cnpj?: string;
}

export interface PlanoSaudeConfig {
  habilitado: boolean;
  sigla: string;
  nome: string;
  cnpj?: string;
}

export interface HighlightItem {
  slug: string;
  titulo: string;
  descricao?: string;
  icone: string;
}

export interface PortalConfig {
  portalSlug: string;
  displayName: string;
  uf: string;
  portalUrl: string;
  baseHost: string;
  cidadeClean: string;
  anoInicial: number;
  empresaPadrao: string;
  brasaoAsset: string;
  dataExtracao: string;
  dataExtracaoDate: Date | null;
  previdencia: PrevidenciaConfig;
  planoSaude?: PlanoSaudeConfig;
  highlights: HighlightItem[];
}

export interface EntidadeItem {
  id: string;
  nome: string;
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

const FALLBACK_PORCIUNCULA: PortalConfig = {
  portalSlug: "porciuncula_prefeitura",
  displayName: "Prefeitura de Porciúncula",
  uf: "RJ",
  portalUrl: "https://transparencia.porciuncula.rj.gov.br/transparencia/",
  baseHost: "https://transparencia.porciuncula.rj.gov.br",
  cidadeClean: "PORCIUNCULA",
  anoInicial: 2021,
  empresaPadrao: "7",
  brasaoAsset: "brasao-porciuncula.svg",
  dataExtracao: "",
  dataExtracaoDate: null,
  previdencia: {
    habilitado: true,
    sigla: "CAPREM",
    nome: "Caixa de Aposentadoria e Pensões dos Servidores Públicos de Porciúncula",
    cnpj: "01180031000134",
  },
  planoSaude: {
    habilitado: true,
    sigla: "CASP",
    nome: "Caixa de Assistência a Saúde dos Servidores Municipais de Porciúncula",
    cnpj: "07573075000100",
  },
  highlights: [
    {
      slug: "saude",
      titulo: "Saúde",
      descricao: "Execução orçamentária e fornecedores da saúde",
      icone: "HeartPulse",
    },
    {
      slug: "previdencia",
      titulo: "CAPREM",
      descricao: "Previdência municipal e sustentabilidade atuarial",
      icone: "Landmark",
    },
  ],
};

function parseRowToPortalConfig(row: Record<string, unknown>): PortalConfig {
  let dataExtracaoStr = "";

  const dataExtracaoDate: Date | null = (() => {
    if (!row.data_extracao) return null;
    if (row.data_extracao instanceof Date) {
      if (Number.isNaN(row.data_extracao.getTime())) return null;
      const y = row.data_extracao.getUTCFullYear();
      const m = row.data_extracao.getUTCMonth();
      const d = row.data_extracao.getUTCDate();
      return new Date(Date.UTC(y, m, d, 12, 0, 0));
    }
    if (
      typeof row.data_extracao === "object" &&
      "toISOString" in (row.data_extracao as Record<string, unknown>)
    ) {
      const d = row.data_extracao as unknown as Date;
      if (Number.isNaN(d.getTime())) return null;
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const day = d.getUTCDate();
      return new Date(Date.UTC(y, m, day, 12, 0, 0));
    }
    const str = String(row.data_extracao).trim();
    if (!str) return null;
    const normalized = str.includes(" ") ? str.replace(" ", "T") : str;
    const parsed = normalized.includes("T")
      ? new Date(normalized)
      : new Date(`${normalized}T12:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })();

  if (dataExtracaoDate) {
    dataExtracaoStr = dataExtracaoDate.toISOString().split("T")[0];
  } else if (row.data_extracao) {
    dataExtracaoStr = String(row.data_extracao).split("T")[0];
  }

  const previdenciaHabilitado = Boolean(
    row.previdencia_habilitado === true ||
      row.previdencia_habilitado === "true" ||
      row.previdencia_habilitado === 1,
  );

  const previdencia: PrevidenciaConfig = {
    habilitado: previdenciaHabilitado,
    sigla: String(row.previdencia_sigla || ""),
    nome: String(row.previdencia_nome || ""),
    cnpj: row.previdencia_cnpj ? String(row.previdencia_cnpj) : undefined,
  };

  const planoSaudeHabilitado = Boolean(
    row.plano_saude_habilitado === true ||
      row.plano_saude_habilitado === "true" ||
      row.plano_saude_habilitado === 1,
  );

  const planoSaude: PlanoSaudeConfig = {
    habilitado: planoSaudeHabilitado,
    sigla: String(row.plano_saude_sigla || ""),
    nome: String(row.plano_saude_nome || ""),
    cnpj: row.plano_saude_cnpj ? String(row.plano_saude_cnpj) : undefined,
  };

  const highlights: HighlightItem[] = (() => {
    if (!row.highlights_json) return [];
    try {
      const raw =
        typeof row.highlights_json === "string"
          ? JSON.parse(row.highlights_json)
          : row.highlights_json;
      if (Array.isArray(raw)) {
        return raw.map((item) => ({
          slug: String(item.slug || ""),
          titulo: String(item.titulo || ""),
          descricao: item.descricao ? String(item.descricao) : undefined,
          icone: String(item.icone || ""),
        }));
      }
    } catch {
      return [];
    }
    return [];
  })();

  return {
    portalSlug: String(row.portal_slug || ""),
    displayName: String(row.display_name || ""),
    uf: String(row.uf || ""),
    portalUrl: String(row.portal_url || ""),
    baseHost: String(row.base_host || ""),
    cidadeClean: String(row.cidade_clean || ""),
    anoInicial: Number(row.ano_inicial) || new Date().getFullYear(),
    empresaPadrao: String(row.empresa_padrao || ""),
    brasaoAsset: String(row.brasao_asset || ""),
    dataExtracao: dataExtracaoStr,
    dataExtracaoDate,
    previdencia,
    planoSaude,
    highlights,
  };
}

export async function getPortalConfig(
  portalSlug = "porciuncula_prefeitura",
): Promise<PortalConfig | null> {
  const canonicalSlug = resolvePortalSlug(portalSlug);
  try {
    const result = await sql<Record<string, unknown>>`
      select * from dim_portais where portal_slug = ${canonicalSlug} limit 1
    `.execute(db);

    if (result.rows.length > 0) {
      return parseRowToPortalConfig(result.rows[0]);
    }
  } catch (_error) {}

  if (canonicalSlug === "porciuncula_prefeitura") {
    return FALLBACK_PORCIUNCULA;
  }

  return null;
}

export async function getAllPortais(): Promise<PortalConfig[]> {
  try {
    const result = await sql<Record<string, unknown>>`
      select * from dim_portais order by display_name asc
    `.execute(db);

    if (result.rows.length > 0) {
      return result.rows.map(parseRowToPortalConfig);
    }
  } catch (_error) {}

  return [FALLBACK_PORCIUNCULA];
}

export async function getEntidades(
  portalSlug = "porciuncula_prefeitura",
): Promise<EntidadeItem[]> {
  const canonicalSlug = resolvePortalSlug(portalSlug);
  try {
    const result = await sql<{ id: string; nome: string }>`
      select empresa_id as id, orgao_nome as nome from dim_orgao where portal_slug = ${canonicalSlug}
      order by case when empresa_id ~ '^[0-9]+$' then empresa_id::integer else 999 end asc, empresa_id asc
    `.execute(db);

    if (result.rows.length > 0) {
      return result.rows.map((row) => ({
        id: String(row.id),
        nome: String(row.nome || ""),
      }));
    }
  } catch (_error) {}

  return [];
}

export async function getPortalSlugs(): Promise<string[]> {
  try {
    const result = await sql<{ portal_slug: string }>`
      select distinct portal_slug from dim_portais where portal_slug is not null order by portal_slug asc
    `.execute(db);

    if (result.rows.length > 0) {
      return result.rows.map((row) => String(row.portal_slug)).filter(Boolean);
    }
  } catch (_error) {}

  return ["porciuncula_prefeitura"];
}
