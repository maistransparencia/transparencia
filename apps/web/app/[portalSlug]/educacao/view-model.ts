import type {
  EducacaoCategoriaContrato,
  EducacaoContratoDTO,
  EducacaoExecucaoAnualDTO,
  EducacaoMatriculasDTO,
  EducacaoMediasEstaduais,
  EducacaoMetricDTO,
  EducacaoOrigemRecursosDTO,
  EducacaoRankingEstadualDTO,
  EducacaoSiopeDTO,
  EmendasEducacaoStatsDTO,
  EtapaEnsino,
  FornecedorExecucaoItemDTO,
  MinimoLegalDTO,
} from "@transparencia/db";
import { emendasStatsVazio } from "@transparencia/db";
import { getPartialYearPeriod } from "@transparencia/ui";

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

export interface EducacaoExecucaoAnoView {
  ano: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  /** Pago sem despesa de pessoal: base da parte paga aos maiores fornecedores. */
  pagoSemPessoal: number;
  /** Falso quando não há despesa da função 12 registrada no ano. */
  temDados: boolean;
}

export interface AprendizadoEtapa {
  etapaEnsino: EtapaEnsino;
  titulo: string;
  /** Última nota do IDEB até o ano selecionado, com o ano em que foi apurada. */
  notaIdeb: number | null;
  anoApuracao: number | null;
  metaIdeb: number | null;
  atingiuMeta: boolean | null;
  notaAnterior: number | null;
  anoAnterior: number | null;
  variacaoPontos: number | null;
  classificacao: {
    posicao: number;
    total: number;
    /** Posições ganhas (positivo) ou perdidas (negativo); nulo quando não comparável. */
    variacaoPosicoes: number | null;
    /** Redes avaliadas nos dois ciclos, base da variação (nulo quando não comparável). */
    redesComparadas: number | null;
    /** Total de redes do ciclo anterior, para dizer a base quando redes saíram. */
    totalCicloAnterior: number | null;
  } | null;
}

export interface ValorPorAlunoPonto {
  ano: number;
  valor: number;
  parcial: boolean;
  periodo: number;
}

export type ValorPorAlunoSemValorCausa =
  | "sem_dado_siope"
  | "nao_informado_ao_fnde";

export interface ValorPorAlunoView {
  ano: number;
  /** Indicador 4.9 do ano selecionado, em R$ da época; nulo quando não há valor. */
  valor: number | null;
  parcial: boolean;
  periodo: number | null;
  semValorCausa: ValorPorAlunoSemValorCausa | null;
  /** Ano fechado imediatamente anterior com valor, só quando o atual também é fechado. */
  anoAnterior: number | null;
  variacaoValor: number | null;
  variacaoPercentual: number | null;
  /** Série anual do próprio município, do mais antigo ao mais recente. */
  serie: ValorPorAlunoPonto[];
}

/** Total de alunos da rede municipal no Censo Escolar (INEP). */
export interface AlunosRedeView {
  total: number;
  /** Ano real do Censo, que pode ser anterior ao ano selecionado. */
  anoCenso: number;
}

export interface MinimosLegaisView {
  ano: number;
  /** Ano em andamento: percentual acumulado, sem veredito. */
  parcial: boolean;
  periodo: number | null;
  /** O SIOPE não tem linha para o ano selecionado. */
  semDadoSiope: boolean;
  mde: MinimoLegalDTO;
  fundebProfissionais: MinimoLegalDTO;
}

export interface EducacaoViewModel {
  portalSlug: string;
  municipioNome: string;
  municipioUf: string;
  selectedYear: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  selectedEtapa: EtapaEnsino;
  execucao: EducacaoExecucaoAnoView;
  serieAnual: Array<{ ano: number; empenhado: number; pago: number }>;
  topFornecedores: FornecedorExecucaoItemDTO[];
  aprendizado: {
    anosIniciais: AprendizadoEtapa;
    anosFinais: AprendizadoEtapa;
  };
  historico: {
    anosIniciais: IdebEtapaHistorico;
    anosFinais: IdebEtapaHistorico;
  };
  contratos: EducacaoContratoDTO[];
  emendas: EmendasEducacaoStatsDTO;
  origemRecursos: EducacaoOrigemRecursosDTO | null;
  valorPorAluno: ValorPorAlunoView;
  /** `null` sem Censo disponível: o indicador não aparece. */
  alunosRede: AlunosRedeView | null;
  minimosLegais: MinimosLegaisView;
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
      ? `Média da rede pública (${municipioUf.trim()})`
      : "Média da rede pública do estado";

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

function buildAprendizadoEtapa({
  historico,
  anoSelecionado,
  titulo,
  ranking,
}: {
  historico: IdebEtapaHistorico;
  anoSelecionado: number;
  titulo: string;
  ranking: EducacaoRankingEstadualDTO | null;
}): AprendizadoEtapa {
  const apurados = historico.pontos.filter(
    (ponto) => ponto.ano <= anoSelecionado && ponto.notaIdeb !== null,
  );
  const atual = apurados[apurados.length - 1] ?? null;
  const anterior = apurados[apurados.length - 2] ?? null;
  // Nota e posição só se comparam quando falam do mesmo ciclo anterior.
  const cicloAnteriorConfere =
    ranking?.anoCicloAnterior != null &&
    ranking.anoCicloAnterior === anterior?.ano;

  return {
    etapaEnsino: historico.etapaEnsino,
    titulo,
    notaIdeb: atual?.notaIdeb ?? null,
    anoApuracao: atual?.ano ?? null,
    metaIdeb: atual?.metaMec ?? null,
    atingiuMeta: atual?.atingiuMeta ?? null,
    notaAnterior: anterior?.notaIdeb ?? null,
    anoAnterior: anterior?.ano ?? null,
    variacaoPontos: atual?.crescimentoPontos ?? null,
    classificacao:
      ranking?.posicaoRanking != null && ranking.totalMunicipios != null
        ? {
            posicao: ranking.posicaoRanking,
            total: ranking.totalMunicipios,
            variacaoPosicoes: cicloAnteriorConfere
              ? ranking.variacaoPosicoes
              : null,
            redesComparadas: cicloAnteriorConfere
              ? (ranking.redesComparadas ?? null)
              : null,
            totalCicloAnterior: cicloAnteriorConfere
              ? ranking.totalMunicipiosCicloAnterior
              : null,
          }
        : null,
  };
}

const execucaoVazia = (ano: number): EducacaoExecucaoAnoView => ({
  ano,
  empenhado: 0,
  liquidado: 0,
  pago: 0,
  pagoSemPessoal: 0,
  temDados: false,
});

function buildExecucaoAno(
  execucaoAnual: EducacaoExecucaoAnualDTO[],
  ano: number,
): EducacaoExecucaoAnoView {
  const linha = execucaoAnual.find((item) => item.ano === ano);
  if (!linha) {
    return execucaoVazia(ano);
  }
  return {
    ano,
    empenhado: linha.empenhado,
    liquidado: linha.liquidado,
    pago: linha.pago,
    pagoSemPessoal: linha.pagoSemPessoal,
    temDados: linha.empenhado > 0 || linha.pago > 0,
  };
}

export function buildValorPorAluno(
  siope: EducacaoSiopeDTO | null | undefined,
  ano: number,
): ValorPorAlunoView {
  const serie: ValorPorAlunoPonto[] = (siope?.serie ?? []).flatMap((item) =>
    item.investimentoPorAluno === null
      ? []
      : [
          {
            ano: item.ano,
            valor: item.investimentoPorAluno,
            parcial: item.situacao === "parcial",
            periodo: item.periodo,
          },
        ],
  );
  const atual = siope?.atual ?? null;
  const valor = atual?.investimentoPorAluno ?? null;
  const parcial = atual?.situacao === "parcial";
  const anterior =
    valor !== null && !parcial
      ? serie
          .filter((ponto) => !ponto.parcial && ponto.ano < ano)
          .reduce<ValorPorAlunoPonto | null>(
            (maisRecente, ponto) =>
              maisRecente === null || ponto.ano > maisRecente.ano
                ? ponto
                : maisRecente,
            null,
          )
      : null;
  const variacaoValor =
    valor !== null && anterior !== null ? valor - anterior.valor : null;
  const semValorCausa: ValorPorAlunoSemValorCausa | null = (() => {
    if (valor !== null) return null;
    return atual === null ? "sem_dado_siope" : "nao_informado_ao_fnde";
  })();

  return {
    ano,
    valor,
    parcial,
    periodo: atual?.periodo ?? null,
    semValorCausa,
    anoAnterior: anterior?.ano ?? null,
    variacaoValor,
    variacaoPercentual:
      variacaoValor !== null && anterior !== null && anterior.valor !== 0
        ? (variacaoValor / anterior.valor) * 100
        : null,
    serie,
  };
}

export function buildMinimosLegais(
  siope: EducacaoSiopeDTO | null | undefined,
  ano: number,
): MinimosLegaisView {
  const semMinimo: MinimoLegalDTO = {
    limite: null,
    percentualAplicado: null,
    resultado: "sem_dado",
    baseLegal: null,
    urlBaseLegal: null,
  };
  return {
    ano,
    parcial: siope?.atual?.situacao === "parcial",
    periodo: siope?.atual?.periodo ?? null,
    semDadoSiope: !siope?.atual,
    mde: siope?.minimos.mde ?? semMinimo,
    fundebProfissionais: siope?.minimos.fundebProfissionais ?? semMinimo,
  };
}

export function buildAlunosRede(
  matriculas: EducacaoMatriculasDTO | null | undefined,
): AlunosRedeView | null {
  if (!matriculas) return null;
  return {
    total: matriculas.matriculasEnsinoFundamental,
    anoCenso: matriculas.anoCenso,
  };
}

export function buildEducacaoViewModel(raw: {
  portalSlug: string;
  portalConfig?: {
    cidadeClean?: string;
    uf?: string;
    displayName?: string;
    dataExtracao?: string | Date | null;
    dataExtracaoDate?: string | Date | null;
  } | null;
  allMetrics: EducacaoMetricDTO[];
  contratos: EducacaoContratoDTO[];
  emendas?: EmendasEducacaoStatsDTO;
  origemRecursos?: EducacaoOrigemRecursosDTO | null;
  siope?: EducacaoSiopeDTO | null;
  matriculas?: EducacaoMatriculasDTO | null;
  mediasEstaduais?: EducacaoMediasEstaduais;
  execucaoAnual?: EducacaoExecucaoAnualDTO[];
  topFornecedores?: FornecedorExecucaoItemDTO[];
  rankingAnosIniciais?: EducacaoRankingEstadualDTO | null;
  rankingAnosFinais?: EducacaoRankingEstadualDTO | null;
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
  const execucaoAnual = raw.execucaoAnual ?? [];

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

  const contratos = raw.contratos;
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
    partialPeriod: getPartialYearPeriod(
      raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
    ),
    selectedEtapa: raw.context.selectedEtapa,
    execucao: buildExecucaoAno(execucaoAnual, raw.context.selectedYear),
    serieAnual: execucaoAnual.map(({ ano, empenhado, pago }) => ({
      ano,
      empenhado,
      pago,
    })),
    topFornecedores: raw.topFornecedores ?? [],
    aprendizado: {
      anosIniciais: buildAprendizadoEtapa({
        historico: historicoIniciais,
        anoSelecionado: raw.context.selectedYear,
        titulo: historicoIniciais.label,
        ranking: raw.rankingAnosIniciais ?? null,
      }),
      anosFinais: buildAprendizadoEtapa({
        historico: historicoFinais,
        anoSelecionado: raw.context.selectedYear,
        titulo: historicoFinais.label,
        ranking: raw.rankingAnosFinais ?? null,
      }),
    },
    historico: {
      anosIniciais: historicoIniciais,
      anosFinais: historicoFinais,
    },
    contratos,
    emendas: raw.emendas ?? emendasStatsVazio,
    origemRecursos: raw.origemRecursos ?? null,
    valorPorAluno: buildValorPorAluno(raw.siope, raw.context.selectedYear),
    alunosRede: buildAlunosRede(raw.matriculas),
    minimosLegais: buildMinimosLegais(raw.siope, raw.context.selectedYear),
    contratosResumo: {
      totalContratos: contratos.length,
      valorTotalContratos: contratos.reduce(
        (acc, c) => acc + (c.valorContrato || 0),
        0,
      ),
      totalEmpenhado: contratos.reduce(
        (acc, c) => acc + (c.totalEmpenhado || 0),
        0,
      ),
      totalPago: contratos.reduce((acc, c) => acc + (c.totalPago || 0), 0),
      porCategoria,
      totaisPorCategoria: buildTotaisPorCategoria(contratos),
    },
  };
}
