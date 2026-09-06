import {
  getEntidades,
  getHistoriaSaudeMetrics,
  getPortalConfig,
  getSaudeContratosCountMetrics,
  getSaudeEmendasMetrics,
  getSaudeExecutionTrendMetrics,
  getSaudeFontesReceitaMetrics,
  getSaudeFornecedoresCountMetrics,
  getSaudeLicitacoesMetrics,
} from "@transparencia/db";

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

export const HHI_CORTE_MODERADA = 1500;
export const HHI_CORTE_ALTA = 2500;

export type NivelConcentracao = "baixa" | "moderada" | "alta";

export const HHI_NIVEIS_CONCENTRACAO = {
  alta: {
    nivel: "alta" as const,
    label: "Alta",
    descricao:
      "Alto risco de dependência: poucos fornecedores dominam os fornecimentos",
  },
  moderada: {
    nivel: "moderada" as const,
    label: "Moderada",
    descricao: "Mercado moderadamente concentrado em poucas empresas",
  },
  baixa: {
    nivel: "baixa" as const,
    label: "Baixa",
    descricao: "Compras bem distribuídas entre múltiplos fornecedores",
  },
} as const;

export interface ConcentracaoFornecedores {
  hhi: number;
  nivel: NivelConcentracao;
  label: string;
  descricao: string;
}

/** Alias para a métrica de concentração no bloco de assistência farmacêutica */
export type FarmaceuticaConcentracao = ConcentracaoFornecedores;

export function classifyHhi(hhi: number): ConcentracaoFornecedores {
  if (hhi >= HHI_CORTE_ALTA) {
    return {
      hhi,
      ...HHI_NIVEIS_CONCENTRACAO.alta,
    };
  }
  if (hhi >= HHI_CORTE_MODERADA) {
    return {
      hhi,
      ...HHI_NIVEIS_CONCENTRACAO.moderada,
    };
  }
  return {
    hhi,
    ...HHI_NIVEIS_CONCENTRACAO.baixa,
  };
}

export async function loadSaudeData(
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
    getPortalConfig(tenantSlug),
  ]);

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
  const hhiVal = Math.round(saudeMetrics?.hhiConcentracaoFornecedores ?? 0);
  const concentracao = classifyHhi(hhiVal);

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
    farmaceutica: {
      medicamentosInsumos: medicamentosInsumosEmpenhado,
      medicamentosInsumosPago: medicamentosInsumosPago,
      judicializacao: judicializacaoEmpenhado,
      judicializacaoPago: judicializacaoPago,
      hhi: hhiVal,
      hhiClassificacao: concentracao.nivel,
      concentracao,
    },
    fontesReceita: {
      ...fontesReceitaMetrics,
      emendasParlamentares: emendasStats.totalAutorizado || emendasArrecadado,
    },
    executionTrend,
    licitacoesSaude,
    emendasStats,
    emendas: emendasStats.lista,
    emendasTotal: emendasStats.totalAutorizado || emendasArrecadado,
  };

  return {
    portalSlug: tenantSlug,
    context,
    portalConfig,
    saude,
  };
}
