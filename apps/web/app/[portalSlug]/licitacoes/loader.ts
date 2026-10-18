import {
  getAdesaoDeAtaMetrics,
  getAdesaoExternaMetrics,
  getAnomaliasContratuaisMetrics,
  getContratosServicosVigentes,
  getDistribucaoModalidadesMetrics,
  getEntidades,
  getLicitacaoGapsMetrics,
  getLicitacaoItensBatch,
  getLicitacoesEmAndamentoMetrics,
  getLimiteDispensaComprasServicos,
  getPortalConfig,
  getRadarCivicoAlertas,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface LicitacoesSearchParams {
  ano?: string;
  entidades?: string;
}

export interface LicitacoesContext {
  selectedYear: number;
  isCurrentYear: boolean;
  entidadesIds?: string[];
}

export function parseLicitacoesContext(
  searchParams: LicitacoesSearchParams,
): LicitacoesContext {
  const currentYear = new Date().getFullYear();
  const parsedYear = searchParams?.ano ? Number(searchParams.ano) : NaN;
  const selectedYear =
    !Number.isNaN(parsedYear) && parsedYear > 1900 ? parsedYear : currentYear;
  const entidadesIds = searchParams?.entidades
    ? searchParams.entidades.split(",").filter(Boolean)
    : undefined;

  return {
    selectedYear,
    isCurrentYear: selectedYear === currentYear,
    entidadesIds,
  };
}

function requirePortalSlug(portalSlug: string): string {
  if (!portalSlug || typeof portalSlug !== "string") {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  const normalized = portalSlug.trim();
  if (!normalized) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  return normalized;
}

async function resolveEmpresaIds(
  portalSlug: string,
  entidadesIds?: string[],
): Promise<string[]> {
  if (entidadesIds && entidadesIds.length > 0) {
    return entidadesIds;
  }

  const entidades = await getEntidades(portalSlug);
  return entidades.map((entidade) => entidade.id).filter(Boolean);
}

export async function fetchRawLicitacoesData(
  portalSlug: string,
  searchParams: LicitacoesSearchParams,
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const context = parseLicitacoesContext(searchParams);
  const { selectedYear, entidadesIds } = context;
  const empresaIds = await resolveEmpresaIds(tenantSlug, entidadesIds);

  const [
    gaps,
    adesao,
    adesaoExterna,
    anomalias,
    modalidades,
    contratosServicosVigentes,
    limiteDispensaComprasServicos,
    portalConfig,
    licitacoesEmAndamento,
    alertasRadar,
  ] = await Promise.all([
    getLicitacaoGapsMetrics(tenantSlug, selectedYear, empresaIds),
    getAdesaoDeAtaMetrics(tenantSlug, selectedYear, empresaIds),
    getAdesaoExternaMetrics(tenantSlug, selectedYear, empresaIds),
    getAnomaliasContratuaisMetrics(tenantSlug, selectedYear, empresaIds),
    getDistribucaoModalidadesMetrics(tenantSlug, selectedYear, empresaIds),
    getContratosServicosVigentes(tenantSlug, selectedYear, empresaIds),
    getLimiteDispensaComprasServicos(tenantSlug, selectedYear),
    getPortalConfig(tenantSlug),
    getLicitacoesEmAndamentoMetrics(tenantSlug, {
      ano: selectedYear,
      empresaIds,
    }),
    getRadarCivicoAlertas(tenantSlug, { ano: selectedYear }),
  ]);

  const licitacoesNumeros = licitacoesEmAndamento
    .map((l) => l.licitacaoNumero)
    .filter((num): num is string => Boolean(num && num.trim().length > 0));

  const itensByLicitacao = await getLicitacaoItensBatch(tenantSlug, {
    ano: selectedYear,
    licitacoesNumeros,
  });

  return {
    portalSlug: tenantSlug,
    context,
    portalConfig,
    gaps,
    adesao,
    adesaoExterna,
    anomalias,
    modalidades,
    contratosServicosVigentes,
    limiteDispensaComprasServicos,
    licitacoesEmAndamento,
    itensByLicitacao,
    alertasRadar,
  };
}

export const loadLicitacoesData = createCachedDataLoader(
  fetchRawLicitacoesData,
  "licitacoes",
);
