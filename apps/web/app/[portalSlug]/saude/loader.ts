import {
  getEntidades,
  getHistoriaSaudeMetrics,
  getLicitacoesEmAndamentoMetrics,
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

export interface FarmaceuticaConcentracao {
  hhi: number;
  nivel: "baixa" | "moderada" | "alta";
  label: string;
  descricao: string;
}

export function classifyHhi(hhi: number): FarmaceuticaConcentracao {
  if (hhi <= 0 || Number.isNaN(hhi)) {
    return {
      hhi: 0,
      nivel: "baixa",
      label: "Não aplicável",
      descricao:
        "Sem registros de aquisições de insumos ou contratos no exercício",
    };
  }
  if (hhi >= 2500) {
    return {
      hhi,
      nivel: "alta",
      label: "Alta",
      descricao:
        "Alto risco de dependência: poucos fornecedores dominam os fornecimentos",
    };
  }
  if (hhi >= 1500) {
    return {
      hhi,
      nivel: "moderada",
      label: "Moderada",
      descricao: "Mercado moderadamente concentrado em poucas empresas",
    };
  }
  return {
    hhi,
    nivel: "baixa",
    label: "Baixa",
    descricao: "Compras bem distribuídas entre múltiplos fornecedores",
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
    licitacoesEmAndamento,
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
    licitacoesEmAndamento,
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
