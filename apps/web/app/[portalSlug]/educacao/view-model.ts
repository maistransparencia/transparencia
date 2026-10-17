import type {
  EducacaoCategoriaContrato,
  EducacaoContratoDTO,
  EducacaoMetricDTO,
  EtapaEnsino,
} from "@transparencia/db";

export interface TrofeuCivicoKPIs {
  notaAtual: number | null;
  notaAnterior: number | null;
  crescimentoPontos: number | null;
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
  mediaEstadualRj: number | null;
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
}

export interface EducacaoFiscalTermometro {
  nome: string;
  artigoLegal: string;
  artigoUrl: string;
  minimoConstitucionalPct: number;
  percentualAplicado: number;
  cumprido: boolean;
  descricao: string;
}

export interface CustoIdebCorrelacaoPonto {
  ano: number;
  custoPorAluno: number | null;
  notaIdebIniciais: number | null;
  notaIdebFinais: number | null;
}

export interface EducacaoFiscalPainel {
  mde: EducacaoFiscalTermometro;
  fundeb: EducacaoFiscalTermometro;
  correlacao: CustoIdebCorrelacaoPonto[];
  custoAlunoAtual: number | null;
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
  contratosResumo: {
    totalContratos: number;
    valorTotalContratos: number;
    totalEmpenhado: number;
    totalPago: number;
    porCategoria: Record<EducacaoCategoriaContrato, number>;
  };
}

const MEDIA_ESTADUAL_RJ: Record<EtapaEnsino, Record<number, number>> = {
  anosIniciais: {
    2021: 5.2,
    2023: 5.1,
    2025: 5.3,
  },
  anosFinais: {
    2021: 4.8,
    2023: 4.6,
    2025: 4.7,
  },
};

function buildEtapaHistorico(
  etapa: EtapaEnsino,
  label: string,
  metrics: EducacaoMetricDTO[],
): IdebEtapaHistorico {
  const etapaMetrics = metrics
    .filter((m) => m.etapaEnsino === etapa)
    .sort((a, b) => a.ano - b.ano);

  const pontos: IdebHistoricoPonto[] = etapaMetrics.map((m) => {
    const mediaRj = MEDIA_ESTADUAL_RJ[etapa][m.ano] ?? null;
    const taxaAprovacao = (() => {
      if (m.indicadorFluxoAprovacao === null) return null;
      return Math.round(m.indicadorFluxoAprovacao * 1000) / 10;
    })();

    return {
      ano: m.ano,
      notaIdeb: m.notaIdeb,
      metaMec: m.metaIdeb,
      mediaEstadualRj: mediaRj,
      saebMatematica: m.saebMatematica,
      saebLinguaPortuguesa: m.saebLinguaPortuguesa,
      taxaAprovacao,
      crescimentoPontos: m.crescimentoPontosIdeb,
      atingiuMeta: m.atingiuMeta,
    };
  });

  const pontoMaisRecente = pontos.length > 0 ? pontos[pontos.length - 1] : null;

  return {
    etapaEnsino: etapa,
    label,
    pontos,
    pontoMaisRecente,
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

  const municipioUf = raw.portalConfig?.uf ?? "RJ";

  const historicoIniciais = buildEtapaHistorico(
    "anosIniciais",
    "Anos Iniciais (1º ao 5º ano)",
    raw.allMetrics,
  );
  const historicoFinais = buildEtapaHistorico(
    "anosFinais",
    "Anos Finais (6º ao 9º ano)",
    raw.allMetrics,
  );

  const pontoMaisRecenteIniciais = historicoIniciais.pontoMaisRecente;

  const notaAtual = (() => {
    if (pontoMaisRecenteIniciais?.notaIdeb != null) {
      return pontoMaisRecenteIniciais.notaIdeb;
    }
    if (raw.resumo?.notaIdeb != null) {
      return raw.resumo.notaIdeb;
    }
    return null;
  })();

  const crescimentoPontos = (() => {
    if (pontoMaisRecenteIniciais?.crescimentoPontos != null) {
      return pontoMaisRecenteIniciais.crescimentoPontos;
    }
    if (raw.resumo?.crescimentoPontosIdeb != null) {
      return raw.resumo.crescimentoPontosIdeb;
    }
    return null;
  })();

  const notaAnterior = (() => {
    const pontos = historicoIniciais.pontos.filter((p) => p.notaIdeb !== null);
    if (pontos.length >= 2) {
      return pontos[pontos.length - 2].notaIdeb;
    }
    if (notaAtual !== null && crescimentoPontos !== null) {
      return Number((notaAtual - crescimentoPontos).toFixed(1));
    }
    return null;
  })();

  const isDestaqueEstadual = Boolean(
    crescimentoPontos !== null && crescimentoPontos >= 1.0,
  );

  const destaqueBadgeTexto = (() => {
    if (isDestaqueEstadual) {
      const pontosFmt = (crescimentoPontos ?? 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
      });
      return `🏆 Maior crescimento do Estado do Rio de Janeiro nos Anos Iniciais (+${pontosFmt} ponto) e Rede Municipal no Top 10 dos Anos Finais`;
    }
    if (crescimentoPontos !== null && crescimentoPontos > 0) {
      const pontosFmt = crescimentoPontos.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
      });
      return `📈 Evolução positiva de +${pontosFmt} ponto no IDEB da Rede Municipal`;
    }
    return "Educação Básica Municipal — Monitoramento Oficial INEP/MEC";
  })();

  const rankingEstadualLabel = (() => {
    if (raw.resumo?.posicaoRanking != null) {
      const pos = raw.resumo.posicaoRanking;
      if (
        raw.resumo.variacaoPosicoes != null &&
        raw.resumo.variacaoPosicoes > 0
      ) {
        return `${pos}º lugar estadual (+${raw.resumo.variacaoPosicoes} posições)`;
      }
      if (
        raw.resumo.variacaoPosicoes != null &&
        raw.resumo.variacaoPosicoes < 0
      ) {
        return `${pos}º lugar estadual (${raw.resumo.variacaoPosicoes} posições)`;
      }
      if (raw.resumo.totalMunicipios != null) {
        return `${pos}º lugar estadual (${raw.resumo.totalMunicipios} municípios)`;
      }
      return `${pos}º lugar estadual`;
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
    notaAtual,
    notaAnterior,
    crescimentoPontos,
    rankingEstadualLabel,
    custoAnualPorAluno,
    totalMatriculas,
    despesaTotalEducacao,
    isDestaqueEstadual,
    destaqueBadgeTexto,
  };

  // Bloco 3: Painel Fiscal (MDE 25% e FUNDEB 70%)
  const mdePercentual = (() => {
    if (raw.resumo?.mdePercentual != null) {
      return raw.resumo.mdePercentual;
    }
    return 25.0;
  })();

  const fundebPercentual = (() => {
    if (raw.resumo?.fundebPercentual != null) {
      return raw.resumo.fundebPercentual;
    }
    return 70.0;
  })();

  const mde: EducacaoFiscalTermometro = {
    nome: "Aplicação em MDE (Mínimo Constitucional)",
    artigoLegal: "Art. 212 da CF/88",
    artigoUrl:
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212",
    minimoConstitucionalPct: 25,
    percentualAplicado: mdePercentual,
    cumprido: mdePercentual >= 25,
    descricao:
      "A receita de impostos é vinculada prioritariamente à Manutenção e Desenvolvimento do Ensino (MDE), com aplicação mínima de 25%.",
  };

  const fundeb: EducacaoFiscalTermometro = {
    nome: "Aplicação do FUNDEB (Profissionais da Educação)",
    artigoLegal: "Art. 212-A da CF/88",
    artigoUrl:
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212a",
    minimoConstitucionalPct: 70,
    percentualAplicado: fundebPercentual,
    cumprido: fundebPercentual >= 70,
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
    const custo =
      mIniciais?.custoAnualPorAluno ?? mFinais?.custoAnualPorAluno ?? null;

    return {
      ano,
      custoPorAluno: custo,
      notaIdebIniciais: mIniciais?.notaIdeb ?? null,
      notaIdebFinais: mFinais?.notaIdeb ?? null,
    };
  });

  const fiscal: EducacaoFiscalPainel = {
    mde,
    fundeb,
    correlacao,
    custoAlunoAtual: custoAnualPorAluno,
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
    contratosResumo: {
      totalContratos: contratos.length,
      valorTotalContratos,
      totalEmpenhado,
      totalPago,
      porCategoria,
    },
  };
}
