import type {
  EducacaoCategoriaContrato,
  EducacaoContratoDTO,
  EducacaoMediasEstaduais,
  EducacaoMetricDTO,
  EducacaoOrigemRecursosDTO,
  EmendasEducacaoStatsDTO,
  EtapaEnsino,
} from "@transparencia/db";
import { emendasStatsVazio } from "@transparencia/db";
import { urlLegislacao } from "@/lib/constants/legislacao";

export const LIMIAR_DESTAQUE_EVOLUCAO_IDEB = 1.0;

export function buildRankingTrend(
  variacaoPosicoes: number | null | undefined,
): { value: string; isPositive?: boolean } | undefined {
  if (variacaoPosicoes === null || variacaoPosicoes === undefined) {
    return undefined;
  }
  if (variacaoPosicoes > 0) {
    return { value: `+${variacaoPosicoes} posições`, isPositive: true };
  }
  if (variacaoPosicoes < 0) {
    return { value: `${variacaoPosicoes} posições`, isPositive: false };
  }
  return { value: "Estável" };
}

export function isDestaqueEvolucaoIdeb(
  crescimentoPontos: number | null | undefined,
): boolean {
  return (
    crescimentoPontos !== null &&
    crescimentoPontos !== undefined &&
    crescimentoPontos >= LIMIAR_DESTAQUE_EVOLUCAO_IDEB
  );
}

export interface TrofeuCivicoKPIs {
  anoBaseIdeb: number;
  eyebrowLabel: string;
  notaAtual: number | null;
  notaAnterior: number | null;
  crescimentoPontos: number | null;
  rankingPosicaoLabel: string;
  rankingSubtext: string;
  rankingTrend?: {
    value: string;
    isPositive?: boolean;
  };
  rankingEstadualLabel: string;
  custoAnualPorAluno: number | null;
  totalMatriculas: number | null;
  despesaTotalEducacao: number | null;
  isDestaqueEstadual: boolean;
  destaqueBadgeTexto: string;
}

export interface IdebHistoricoPonto {
  ano: number;
  notaIdeb: number | null;
  metaMec: number | null;
  mediaEstadual: number | null;
  saebMatematica: number | null;
  saebLinguaPortuguesa: number | null;
  taxaAprovacao: number | null;
  crescimentoPontos: number | null;
  atingiuMeta: boolean | null;
}

export interface IdebEtapaHistorico {
  etapaEnsino: EtapaEnsino;
  label: string;
  pontos: IdebHistoricoPonto[];
  pontoMaisRecente: IdebHistoricoPonto | null;
  periodoLabel: string;
  mediaEstadualLabel: string;
  anosSemMeta: number[];
  possuiMeta: boolean;
  ultimoAnoComMeta: number | null;
}

export interface EducacaoFiscalTermometro {
  nome: string;
  artigoLegal: string;
  artigoUrl: string;
  minimoConstitucionalPct: number;
  percentualAplicado: number | null;
  cumprido: boolean | null;
  descricao: string;
}

export interface CustoIdebCorrelacaoPonto {
  ano: number;
  despesaLiquidada: number | null;
  custoPorAluno?: number | null;
  notaIdebIniciais: number | null;
  notaIdebFinais: number | null;
}

export interface EducacaoFiscalPainel {
  despesaTotalEducacao: number | null;
  custoAlunoAtual: number | null;
  totalMatriculas: number | null;
  mde: EducacaoFiscalTermometro;
  fundeb: EducacaoFiscalTermometro;
  correlacao: CustoIdebCorrelacaoPonto[];
}

export interface EducacaoViewModel {
  portalSlug: string;
  municipioNome: string;
  municipioUf: string;
  selectedYear: number;
  isCurrentYear: boolean;
  selectedEtapa: EtapaEnsino;
  trofeuCivico: TrofeuCivicoKPIs;
  historico: {
    anosIniciais: IdebEtapaHistorico;
    anosFinais: IdebEtapaHistorico;
  };
  fiscal: EducacaoFiscalPainel;
  contratos: EducacaoContratoDTO[];
  emendas: EmendasEducacaoStatsDTO;
  origemRecursos: EducacaoOrigemRecursosDTO | null;
  contratosResumo: {
    totalContratos: number;
    valorTotalContratos: number;
    totalEmpenhado: number;
    totalPago: number;
    porCategoria: Record<EducacaoCategoriaContrato, number>;
    totaisPorCategoria: Record<
      EducacaoCategoriaContrato,
      EducacaoContratosCategoriaTotais
    >;
  };
}

export interface EducacaoContratosCategoriaTotais {
  quantidade: number;
  valorContrato: number;
  totalEmpenhado: number;
  totalPago: number;
}

const CATEGORIAS_CONTRATO: EducacaoCategoriaContrato[] = [
  "merenda_pnae",
  "transporte_pnate",
  "manutencao_geral",
  "locacao_imoveis",
  "outros",
];

function buildTotaisPorCategoria(
  contratos: EducacaoContratoDTO[],
): Record<EducacaoCategoriaContrato, EducacaoContratosCategoriaTotais> {
  return Object.fromEntries(
    CATEGORIAS_CONTRATO.map((categoria) => [
      categoria,
      contratos
        .filter((c) => c.categoria === categoria)
        .reduce<EducacaoContratosCategoriaTotais>(
          (acc, c) => ({
            quantidade: acc.quantidade + 1,
            valorContrato: acc.valorContrato + (c.valorContrato || 0),
            totalEmpenhado: acc.totalEmpenhado + (c.totalEmpenhado || 0),
            totalPago: acc.totalPago + (c.totalPago || 0),
          }),
          {
            quantidade: 0,
            valorContrato: 0,
            totalEmpenhado: 0,
            totalPago: 0,
          },
        ),
    ]),
  ) as Record<EducacaoCategoriaContrato, EducacaoContratosCategoriaTotais>;
}

interface BuildEtapaHistoricoParams {
  etapa: EtapaEnsino;
  label: string;
  metrics: EducacaoMetricDTO[];
  mediasEstaduais?: Record<number, number>;
  municipioUf?: string;
}

function buildEtapaHistorico({
  etapa,
  label,
  metrics,
  mediasEstaduais,
  municipioUf,
}: BuildEtapaHistoricoParams): IdebEtapaHistorico {
  const etapaMetrics = metrics
    .filter((m) => m.etapaEnsino === etapa)
    .sort((a, b) => a.ano - b.ano);

  const mediaEstadualLabel =
    municipioUf && municipioUf.trim() !== ""
      ? `Média ${municipioUf.trim()}`
      : "Média Estadual";

  const pontos: IdebHistoricoPonto[] = etapaMetrics.map((m) => {
    const mediaEstadual = mediasEstaduais?.[m.ano] ?? null;
    const taxaAprovacao = (() => {
      if (m.indicadorFluxoAprovacao === null) return null;
      return Math.round(m.indicadorFluxoAprovacao * 1000) / 10;
    })();

    return {
      ano: m.ano,
      notaIdeb: m.notaIdeb,
      metaMec: m.metaIdeb,
      mediaEstadual,
      saebMatematica: m.saebMatematica,
      saebLinguaPortuguesa: m.saebLinguaPortuguesa,
      taxaAprovacao,
      crescimentoPontos: m.crescimentoPontosIdeb,
      atingiuMeta: m.atingiuMeta,
    };
  });

  const pontoMaisRecente = pontos.length > 0 ? pontos[pontos.length - 1] : null;

  const periodoLabel = (() => {
    if (pontos.length === 0) return "";
    if (pontos.length === 1) return String(pontos[0].ano);
    return `${pontos[0].ano}–${pontos[pontos.length - 1].ano}`;
  })();

  const anosSemMeta = pontos
    .filter((p) => p.metaMec === null)
    .map((p) => p.ano);
  const anosComMeta = pontos
    .filter((p) => p.metaMec !== null)
    .map((p) => p.ano);
  const possuiMeta = anosComMeta.length > 0;
  const ultimoAnoComMeta = possuiMeta ? Math.max(...anosComMeta) : null;

  return {
    etapaEnsino: etapa,
    label,
    pontos,
    pontoMaisRecente,
    periodoLabel,
    mediaEstadualLabel,
    anosSemMeta,
    possuiMeta,
    ultimoAnoComMeta,
  };
}

export function buildEducacaoViewModel(raw: {
  portalSlug: string;
  portalConfig?: {
    cidadeClean?: string;
    uf?: string;
    displayName?: string;
  } | null;
  allMetrics: EducacaoMetricDTO[];
  resumo?: {
    ano: number;
    notaIdeb: number | null;
    crescimentoPontosIdeb: number | null;
    despesaLiquidadaEducacao: number | null;
    totalMatriculasRedeMunicipal: number | null;
    custoAnualPorAluno: number | null;
    posicaoRanking?: number | null;
    totalMunicipios?: number | null;
    variacaoPosicoes?: number | null;
    mdePercentual?: number | null;
    fundebPercentual?: number | null;
    anosIniciais?: EducacaoMetricDTO | null;
    anosFinais?: EducacaoMetricDTO | null;
  } | null;
  contratos: EducacaoContratoDTO[];
  emendas?: EmendasEducacaoStatsDTO;
  origemRecursos?: EducacaoOrigemRecursosDTO | null;
  mediasEstaduais?: EducacaoMediasEstaduais;
  context: {
    selectedYear: number;
    isCurrentYear: boolean;
    selectedEtapa: EtapaEnsino;
  };
}): EducacaoViewModel {
  const municipioNome = (() => {
    const config = raw.portalConfig as
      | { municipioNome?: string }
      | null
      | undefined;
    if (config?.municipioNome) {
      return config.municipioNome;
    }
    if (raw.portalConfig?.cidadeClean) return raw.portalConfig.cidadeClean;
    if (raw.portalConfig?.displayName) return raw.portalConfig.displayName;
    return "Município";
  })();

  const municipioUf = raw.portalConfig?.uf ?? "";

  const historicoIniciais = buildEtapaHistorico({
    etapa: "anosIniciais",
    label: "Anos Iniciais (1º ao 5º ano)",
    metrics: raw.allMetrics,
    mediasEstaduais: raw.mediasEstaduais?.anosIniciais,
    municipioUf,
  });
  const historicoFinais = buildEtapaHistorico({
    etapa: "anosFinais",
    label: "Anos Finais (6º ao 9º ano)",
    metrics: raw.allMetrics,
    mediasEstaduais: raw.mediasEstaduais?.anosFinais,
    municipioUf,
  });

  const anoBaseIdeb = (() => {
    if (raw.resumo?.ano && raw.resumo.ano <= raw.context.selectedYear) {
      return raw.resumo.ano;
    }
    const metricRecent = raw.allMetrics
      .filter((m) => m.ano <= raw.context.selectedYear && m.notaIdeb != null)
      .sort((a, b) => b.ano - a.ano)[0];
    if (metricRecent?.ano) {
      return metricRecent.ano;
    }
    if (raw.context.selectedYear % 2 === 0) {
      return raw.context.selectedYear - 1;
    }
    return raw.context.selectedYear;
  })();

  const eyebrowLabel = (() => {
    if (raw.context.selectedYear !== anoBaseIdeb) {
      return `TEMAS · EDUCAÇÃO BÁSICA · EXERCÍCIO ${raw.context.selectedYear} (ANO-BASE IDEB ${anoBaseIdeb})`;
    }
    return `TEMAS · EDUCAÇÃO BÁSICA · ${raw.context.selectedYear} (ANO-BASE IDEB)`;
  })();

  const pontoCicloBaseIniciais =
    historicoIniciais.pontos.find((p) => p.ano === anoBaseIdeb) ??
    historicoIniciais.pontos
      .filter((p) => p.ano <= raw.context.selectedYear)
      .sort((a, b) => b.ano - a.ano)[0] ??
    historicoIniciais.pontoMaisRecente;

  const notaAtual = (() => {
    if (pontoCicloBaseIniciais?.notaIdeb != null) {
      return pontoCicloBaseIniciais.notaIdeb;
    }
    if (raw.resumo?.notaIdeb != null) {
      return raw.resumo.notaIdeb;
    }
    return null;
  })();

  const crescimentoPontos = (() => {
    if (pontoCicloBaseIniciais?.crescimentoPontos != null) {
      return pontoCicloBaseIniciais.crescimentoPontos;
    }
    if (raw.resumo?.crescimentoPontosIdeb != null) {
      return raw.resumo.crescimentoPontosIdeb;
    }
    return null;
  })();

  const notaAnterior = (() => {
    const pontosAteCiclo = historicoIniciais.pontos.filter(
      (p) => p.ano <= anoBaseIdeb && p.notaIdeb !== null,
    );
    if (pontosAteCiclo.length >= 2) {
      return pontosAteCiclo[pontosAteCiclo.length - 2].notaIdeb;
    }
    if (notaAtual !== null && crescimentoPontos !== null) {
      return Number((notaAtual - crescimentoPontos).toFixed(1));
    }
    return null;
  })();

  const isDestaqueEstadual = isDestaqueEvolucaoIdeb(crescimentoPontos);

  const destaqueBadgeTexto = (() => {
    if (crescimentoPontos !== null && crescimentoPontos > 0) {
      const pontosFmt = crescimentoPontos.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
      });
      return `Evolução de +${pontosFmt} ponto no IDEB da Rede Municipal`;
    }
    if (crescimentoPontos !== null && crescimentoPontos < 0) {
      const pontosFmt = Math.abs(crescimentoPontos).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
      });
      return `Variação de -${pontosFmt} ponto no IDEB (${anoBaseIdeb})`;
    }
    if (notaAtual !== null) {
      const notaFmt = notaAtual.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
      });
      return `Nota ${notaFmt} no IDEB — Anos Iniciais da Rede Municipal (${anoBaseIdeb})`;
    }
    return "Educação Básica Municipal — Monitoramento Oficial INEP/MEC";
  })();

  const rankingPos = raw.resumo?.posicaoRanking ?? null;
  const rankingTotalMun = raw.resumo?.totalMunicipios ?? null;
  const rankingVarPos = raw.resumo?.variacaoPosicoes ?? null;

  const rankingPosicaoLabel = (() => {
    if (rankingPos !== null) {
      return `${rankingPos}º lugar`;
    }
    if (isDestaqueEstadual) {
      return "Destaque";
    }
    return "Em apuração";
  })();

  const rankingSubtext = (() => {
    if (rankingTotalMun !== null) {
      return `Entre ${rankingTotalMun} municípios (${municipioUf})`;
    }
    return `Rede Municipal (${municipioUf})`;
  })();

  const rankingTrend = buildRankingTrend(rankingVarPos);

  const rankingEstadualLabel = (() => {
    if (rankingPos !== null) {
      if (rankingVarPos !== null && rankingVarPos > 0) {
        return `${rankingPos}º lugar estadual (+${rankingVarPos} posições)`;
      }
      if (rankingVarPos !== null && rankingVarPos < 0) {
        return `${rankingPos}º lugar estadual (${rankingVarPos} posições)`;
      }
      if (rankingTotalMun !== null) {
        return `${rankingPos}º lugar estadual (${rankingTotalMun} municípios)`;
      }
      return `${rankingPos}º lugar estadual`;
    }
    if (isDestaqueEstadual) {
      return "Destaque no ranking estadual";
    }
    return "Classificação em consolidação";
  })();

  const custoAnualPorAluno = (() => {
    if (raw.resumo?.custoAnualPorAluno != null) {
      return raw.resumo.custoAnualPorAluno;
    }
    const metricWithCost = raw.allMetrics.find(
      (m) => m.custoAnualPorAluno != null && m.custoAnualPorAluno > 0,
    );
    if (metricWithCost?.custoAnualPorAluno != null) {
      return metricWithCost.custoAnualPorAluno;
    }
    return null;
  })();

  const totalMatriculas = (() => {
    if (raw.resumo?.totalMatriculasRedeMunicipal != null) {
      return raw.resumo.totalMatriculasRedeMunicipal;
    }
    const metricWithMatriculas = raw.allMetrics.find(
      (m) =>
        m.totalMatriculasRedeMunicipal != null &&
        m.totalMatriculasRedeMunicipal > 0,
    );
    if (metricWithMatriculas?.totalMatriculasRedeMunicipal != null) {
      return metricWithMatriculas.totalMatriculasRedeMunicipal;
    }
    return null;
  })();

  const despesaTotalEducacao = (() => {
    if (raw.resumo?.despesaLiquidadaEducacao != null) {
      return raw.resumo.despesaLiquidadaEducacao;
    }
    const metricWithDespesa = raw.allMetrics.find(
      (m) =>
        m.despesaLiquidadaEducacao != null && m.despesaLiquidadaEducacao > 0,
    );
    if (metricWithDespesa?.despesaLiquidadaEducacao != null) {
      return metricWithDespesa.despesaLiquidadaEducacao;
    }
    return null;
  })();

  const trofeuCivico: TrofeuCivicoKPIs = {
    anoBaseIdeb,
    eyebrowLabel,
    notaAtual,
    notaAnterior,
    crescimentoPontos,
    rankingPosicaoLabel,
    rankingSubtext,
    rankingTrend,
    rankingEstadualLabel,
    custoAnualPorAluno,
    totalMatriculas,
    despesaTotalEducacao,
    isDestaqueEstadual,
    destaqueBadgeTexto,
  };

  // Bloco 3: Painel Fiscal (MDE 25% e FUNDEB 70%)
  const mdePercentual = raw.resumo?.mdePercentual ?? null;
  const fundebPercentual = raw.resumo?.fundebPercentual ?? null;

  const mde: EducacaoFiscalTermometro = {
    nome: "Aplicação em MDE (Mínimo Constitucional)",
    artigoLegal: "Art. 212 da CF/88",
    artigoUrl: urlLegislacao("constituicao", "art212"),
    minimoConstitucionalPct: 25,
    percentualAplicado: mdePercentual,
    cumprido: mdePercentual !== null ? mdePercentual >= 25 : null,
    descricao:
      "A receita de impostos é vinculada prioritariamente à Manutenção e Desenvolvimento do Ensino (MDE), com aplicação mínima de 25%.",
  };

  const fundeb: EducacaoFiscalTermometro = {
    nome: "Aplicação do FUNDEB (Profissionais da Educação)",
    artigoLegal: "Art. 212-A da CF/88",
    artigoUrl: urlLegislacao("constituicao", "art212a"),
    minimoConstitucionalPct: 70,
    percentualAplicado: fundebPercentual,
    cumprido: fundebPercentual !== null ? fundebPercentual >= 70 : null,
    descricao:
      "Pelo menos 70% dos recursos do FUNDEB devem ser destinados à remuneração dos profissionais da educação básica em efetivo exercício.",
  };

  // Correlação Custo por Aluno vs IDEB por ciclo
  const anosDisponiveis = Array.from(
    new Set(raw.allMetrics.map((m) => m.ano)),
  ).sort((a, b) => a - b);

  const correlacao: CustoIdebCorrelacaoPonto[] = anosDisponiveis.map((ano) => {
    const mIniciais = raw.allMetrics.find(
      (m) => m.ano === ano && m.etapaEnsino === "anosIniciais",
    );
    const mFinais = raw.allMetrics.find(
      (m) => m.ano === ano && m.etapaEnsino === "anosFinais",
    );
    const despesaLiquidada =
      mIniciais?.despesaLiquidadaEducacao ??
      mFinais?.despesaLiquidadaEducacao ??
      null;
    const custo =
      mIniciais?.custoAnualPorAluno ?? mFinais?.custoAnualPorAluno ?? null;

    return {
      ano,
      despesaLiquidada,
      custoPorAluno: custo,
      notaIdebIniciais: mIniciais?.notaIdeb ?? null,
      notaIdebFinais: mFinais?.notaIdeb ?? null,
    };
  });

  const fiscal: EducacaoFiscalPainel = {
    despesaTotalEducacao,
    custoAlunoAtual: custoAnualPorAluno,
    totalMatriculas,
    mde,
    fundeb,
    correlacao,
  };

  // Bloco 4: Resumo dos Contratos
  const contratos = raw.contratos;
  const valorTotalContratos = contratos.reduce(
    (acc, c) => acc + (c.valorContrato || 0),
    0,
  );
  const totalEmpenhado = contratos.reduce(
    (acc, c) => acc + (c.totalEmpenhado || 0),
    0,
  );
  const totalPago = contratos.reduce((acc, c) => acc + (c.totalPago || 0), 0);

  const porCategoria: Record<EducacaoCategoriaContrato, number> = {
    merenda_pnae: 0,
    transporte_pnate: 0,
    manutencao_geral: 0,
    locacao_imoveis: 0,
    outros: 0,
  };

  contratos.forEach((c) => {
    porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + 1;
  });

  return {
    portalSlug: raw.portalSlug,
    municipioNome,
    municipioUf,
    selectedYear: raw.context.selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    selectedEtapa: raw.context.selectedEtapa,
    trofeuCivico,
    historico: {
      anosIniciais: historicoIniciais,
      anosFinais: historicoFinais,
    },
    fiscal,
    contratos,
    emendas: raw.emendas ?? emendasStatsVazio,
    origemRecursos: raw.origemRecursos ?? null,
    contratosResumo: {
      totalContratos: contratos.length,
      valorTotalContratos,
      totalEmpenhado,
      totalPago,
      porCategoria,
      totaisPorCategoria: buildTotaisPorCategoria(contratos),
    },
  };
}
