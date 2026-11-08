import {
  getEntidades,
  getHistoriaSaudeMetrics,
  getLicitacaoItensBatch,
  getLicitacoesEmAndamentoMetrics,
  getPortalConfig,
  getSaudeContratosCountMetrics,
  getSaudeEmendasMetrics,
  getSaudeExecutionTrendMetrics,
  getSaudeFarmaciaResumo,
  getSaudeFontesReceitaMetrics,
  getSaudeFornecedoresCountMetrics,
  getSaudeLicitacoesMetrics,
  getSaudeMinimoConstitucional,
  getSaudeProducaoSus,
  getSaudeRedePorMilMoradores,
  getTopFornecedoresExecucaoMetrics,
  type SaudeFarmaciaResumoDTO,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

const FARMACIA_RESUMO_INDISPONIVEL: SaudeFarmaciaResumoDTO = {
  status: "indisponivel",
  dataPosicaoMaisRecente: null,
  totalUnidadesAtivas: null,
  essenciaisNoEstoque: null,
  totalEssenciais: null,
};

export interface SaudeSearchParams {
  ano?: string;
  entidades?: string;
}

export interface SaudeContext {
  selectedYear: number;
  isCurrentYear: boolean;
}

export function parseSaudeContext(
  searchParams: SaudeSearchParams,
): SaudeContext {
  const currentYear = new Date().getFullYear();
  const parsed = searchParams.ano ? Number(searchParams.ano) : currentYear;
  const selectedYear =
    Number.isInteger(parsed) && parsed > 1900 ? parsed : currentYear;

  return {
    selectedYear,
    isCurrentYear: selectedYear === currentYear,
  };
}

function requirePortalSlug(portalSlug: string): string {
  const normalized = portalSlug.trim();
  if (!normalized) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  return normalized;
}

async function fetchRawSaudeData(
  portalSlug: string,
  searchParams: SaudeSearchParams,
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const entities = await getEntidades(tenantSlug);

  const context = parseSaudeContext(searchParams);
  const empresaIds = entities
    .filter(
      ({ nome }) =>
        nome.toLowerCase().includes("saúde") ||
        nome.toLowerCase().includes("saude"),
    )
    .map((e) => e.id);

  const [
    saudeMetrics,
    executionTrend,
    emendasStats,
    contratosCount,
    fornecedoresCount,
    licitacoesSaude,
    licitacoesEmAndamento,
    topFornecedores,
    portalConfig,
  ] = await Promise.all([
    getHistoriaSaudeMetrics(tenantSlug, context.selectedYear),
    getSaudeExecutionTrendMetrics(tenantSlug),
    getSaudeEmendasMetrics(tenantSlug, context.selectedYear, empresaIds),
    getSaudeContratosCountMetrics(tenantSlug, context.selectedYear, empresaIds),
    getSaudeFornecedoresCountMetrics(
      tenantSlug,
      context.selectedYear,
      empresaIds,
    ),
    getSaudeLicitacoesMetrics(tenantSlug, context.selectedYear, empresaIds),
    getLicitacoesEmAndamentoMetrics(tenantSlug, {
      ano: context.selectedYear,
      empresaIds,
    }),
    getTopFornecedoresExecucaoMetrics({
      portalSlug: tenantSlug,
      year: context.selectedYear,
      empresaIds,
      limit: 5,
    }),
    getPortalConfig(tenantSlug),
  ]);

  const minimoSaude = await getSaudeMinimoConstitucional({
    portalSlug: tenantSlug,
    ano: context.selectedYear,
    anoInicial: portalConfig?.anoInicial,
  });

  const [redePorMilMoradores, producaoSus, farmaciaResumo] = await Promise.all([
    getSaudeRedePorMilMoradores(tenantSlug),
    getSaudeProducaoSus(tenantSlug),
    getSaudeFarmaciaResumo(tenantSlug).catch(
      (): SaudeFarmaciaResumoDTO => FARMACIA_RESUMO_INDISPONIVEL,
    ),
  ]);

  const itensByLicitacao = await getLicitacaoItensBatch(tenantSlug, {
    ano: context.selectedYear,
    licitacoesNumeros: licitacoesEmAndamento
      .map((licitacao) => licitacao.licitacaoNumero)
      .filter((numero): numero is string => Boolean(numero?.trim())),
  });

  const dotacao = saudeMetrics?.dotacaoTotal ?? 0;
  const empenhado = saudeMetrics?.totalEmpenhado ?? 0;
  const liquidado = saudeMetrics?.totalLiquidado ?? 0;
  const pago = saudeMetrics?.totalPago ?? 0;
  const medicamentosInsumosEmpenhado =
    saudeMetrics?.medicamentosInsumosEmpenhado ?? 0;
  const medicamentosInsumosPago = saudeMetrics?.medicamentosInsumosPago ?? 0;
  const judicializacaoEmpenhado = saudeMetrics?.judicializacaoEmpenhado ?? 0;
  const judicializacaoPago = saudeMetrics?.judicializacaoPago ?? 0;
  const emendasArrecadado = saudeMetrics?.emendasSaudeArrecadado ?? 0;

  const fontesReceitaMetrics = await getSaudeFontesReceitaMetrics({
    portalSlug: tenantSlug,
    ano: context.selectedYear,
    empresaIds,
    empenhadoTotal: empenhado,
  });

  const saude = {
    orcamento: {
      dotacao,
      empenhado,
      liquidado,
      pago,
      taxaExecucao: dotacao > 0 ? empenhado / dotacao : 0,
      alertaSubExecucao:
        !context.isCurrentYear && dotacao > 0 && empenhado / dotacao < 0.7,
      medicamentosInsumos: medicamentosInsumosEmpenhado,
      medicamentosInsumosPago: medicamentosInsumosPago,
      judicializacao: judicializacaoEmpenhado,
      judicializacaoPago: judicializacaoPago,
      contratosVinculadosCount: contratosCount,
      fornecedoresAtivosCount: fornecedoresCount,
    },
    fontesReceita: {
      ...fontesReceitaMetrics,
      emendasParlamentares: emendasStats.totalAutorizado || emendasArrecadado,
    },
    executionTrend,
    licitacoesSaude,
    licitacoesEmAndamento,
    itensByLicitacao,
    topFornecedores,
    emendasStats,
    emendas: emendasStats.lista,
    emendasTotal: emendasStats.totalAutorizado || emendasArrecadado,
  };

  return {
    portalSlug: tenantSlug,
    context,
    portalConfig,
    minimoSaude,
    redePorMilMoradores,
    producaoSus,
    farmaciaResumo,
    saude,
  };
}

export const loadSaudeData = createCachedDataLoader(fetchRawSaudeData, "saude");
