import type {
  MotivoAtencaoArea,
  ResumoObrasDTO,
  SituacaoAreaDTO,
  SituacaoHomeDTO,
} from "@transparencia/db";
import { fmtDate, fmtNumber, fmtPercent } from "@transparencia/ui";
import type { EducacaoResumoCardData } from "@/components/educacao-resumo-card";
import {
  FONTES_OFICIAIS,
  type FonteOficial,
} from "@/lib/constants/fontes-oficiais";
import { temEducacaoDestaque } from "@/lib/educacao-destaque";

export type AreaSituacao = "saude" | "obras" | "educacao";
export type StatusFarmaciaCard = "conforme" | "apagao" | "indisponivel";
export type TomCardSituacao = "neutro" | "atencao";
export type EstadoApoioMinimo = "normal" | "parcial" | "abaixo";
export type SentidoVariacao = "subiu" | "caiu";

export interface MinimoLegalEntrada {
  limite: number | null;
  percentualAplicado: number | null;
  baseLegal: string | null;
  urlBaseLegal: string | null;
}

/** Linha de apoio com a régua legal (mínimo exigido) que sustenta a manchete. */
export interface ApoioMinimoModel {
  pergunta: string;
  estado: EstadoApoioMinimo;
  texto: string;
  /** Largura da barra aplicada, em escala de 0 a 100%. */
  barraPercentual: number;
  /** Posição do traço do mínimo, em escala de 0 a 100%. */
  tracoMinimoPercentual: number;
  baseLegal: string | null;
  urlBaseLegal: string | null;
}

export interface SituacaoCidadeCardModel {
  area: AreaSituacao;
  eyebrow: string;
  pergunta: string;
  /** Resposta curta em `stat-value`; `null` quando o card só tem a linha de apoio. */
  manchete: string | null;
  /** Complemento da manchete (ex.: "era 5,4"); `null` quando não há. */
  complemento: string | null;
  /** Sentido da variação, desenhado como seta ao lado do complemento. */
  sentidoComplemento: SentidoVariacao | null;
  fontes: FonteOficial[];
  /** Observação depois das fontes (ex.: a meta do Ideb); `null` quando não há. */
  notaOrigem: string | null;
  /** Aviso de que a manchete não é do ano escolhido; `null` quando é. */
  notaPeriodo: string | null;
  apoio: ApoioMinimoModel | null;
  /** Motivo escrito da etiqueta "Merece atenção"; `null` = sem etiqueta. */
  motivoAtencao: string | null;
  tom: TomCardSituacao;
  detailUrl: string;
}

export interface BuildSituacaoCidadeParams {
  situacao: SituacaoHomeDTO;
  ano: number;
  farmaciaStatus: StatusFarmaciaCard;
  /** Data (ISO) da posição de estoque mais recente divulgada. */
  farmaciaDataPosicao: string | null;
  isCurrentYear: boolean;
  minimoSaude: MinimoLegalEntrada | null;
  resumoObras: ResumoObrasDTO | null;
  educacaoResumo: EducacaoResumoCardData | null;
  minimoEducacao: MinimoLegalEntrada | null;
  saudeDetailUrl: string;
  obrasDetailUrl: string;
  educacaoDetailUrl: string;
}

const MOTIVO_TEXTO_FIXO: Record<
  Exclude<MotivoAtencaoArea, "obra_paralisada">,
  string
> = {
  abaixo_minimo: "Aplicou menos que o mínimo exigido no ano.",
};

const textoMotivoObras = (paralisadas: number): string =>
  paralisadas === 1
    ? "1 obra está parada."
    : `${fmtNumber(paralisadas)} obras estão paradas.`;

const textoMotivo = (
  situacao: SituacaoAreaDTO,
  paralisadas: number,
): string | null => {
  if (!situacao.emAtencao || !situacao.motivo) return null;
  if (situacao.motivo === "obra_paralisada") {
    return textoMotivoObras(paralisadas);
  }
  return MOTIVO_TEXTO_FIXO[situacao.motivo];
};

const montarApoioMinimo = (
  pergunta: string,
  situacao: SituacaoAreaDTO,
  minimo: MinimoLegalEntrada | null,
): ApoioMinimoModel | null => {
  const { estado } = situacao;
  if (estado !== "normal" && estado !== "parcial" && estado !== "abaixo") {
    return null;
  }
  const aplicado = minimo?.percentualAplicado;
  const limite = minimo?.limite;
  if (!minimo || aplicado == null || limite == null) return null;
  const aplicadoTexto = fmtPercent(aplicado, 1);
  const limiteTexto = fmtPercent(limite, 1);
  const textos: Record<EstadoApoioMinimo, string> = {
    normal: `Sim: ${aplicadoTexto} aplicados (mínimo de ${limiteTexto}).`,
    parcial: `Em andamento: ${aplicadoTexto} aplicados até agora (mínimo de ${limiteTexto} no ano).`,
    abaixo: `Ainda não: ${aplicadoTexto} aplicados (mínimo de ${limiteTexto}).`,
  };
  return {
    pergunta,
    estado,
    texto: textos[estado],
    barraPercentual: Math.min(Math.max(aplicado, 0), 100),
    tracoMinimoPercentual: Math.min(Math.max(limite, 0), 100),
    baseLegal: minimo.baseLegal,
    urlBaseLegal: minimo.urlBaseLegal,
  };
};

const tomDoCard = (
  motivoAtencao: string | null,
  apoio: ApoioMinimoModel | null,
): TomCardSituacao => {
  if (motivoAtencao || apoio?.estado === "abaixo") return "atencao";
  return "neutro";
};

const FONTES_SAUDE: FonteOficial[] = [
  FONTES_OFICIAIS.bnafar,
  FONTES_OFICIAIS.siops,
];
const FONTES_OBRAS: FonteOficial[] = [FONTES_OFICIAIS.obrasgov];
const FONTES_EDUCACAO: FonteOficial[] = [
  FONTES_OFICIAIS.ideb,
  FONTES_OFICIAIS.siope,
];

const PERGUNTA_SAUDE = "Tem remédio no posto de saúde?";
const PERGUNTA_OBRAS = "As obras da cidade estão andando?";
const PERGUNTA_EDUCACAO = "A educação da cidade está melhorando?";

const mancheteSaude = (
  status: StatusFarmaciaCard,
  dataPosicao: string | null,
): string | null => {
  if (status === "conforme" && dataPosicao)
    return `Estoque atualizado em ${fmtDate(dataPosicao)}`;
  if (status === "conforme") return "Estoque divulgado em dia";
  if (status === "apagao") return "Sem informação de estoque";
  return null;
};

/**
 * Card de saúde. Com a farmácia `indisponivel` o mínimo vira a manchete única do card
 * (proposta da Story 27.2); sem mínimo também, o card some.
 */
const montarCardSaude = (
  params: BuildSituacaoCidadeParams,
): SituacaoCidadeCardModel | null => {
  const {
    situacao,
    farmaciaStatus,
    farmaciaDataPosicao,
    minimoSaude,
    saudeDetailUrl,
  } = params;
  const apoio = montarApoioMinimo(
    "A Prefeitura aplica o mínimo exigido em saúde?",
    situacao.saude,
    minimoSaude,
  );
  const manchete = mancheteSaude(farmaciaStatus, farmaciaDataPosicao);
  if (!manchete && !apoio) return null;
  const motivoAtencao = textoMotivo(situacao.saude, 0);
  return {
    area: "saude",
    eyebrow: "Saúde",
    pergunta: manchete ? PERGUNTA_SAUDE : (apoio?.pergunta ?? PERGUNTA_SAUDE),
    manchete: manchete ?? apoio?.texto ?? null,
    complemento: null,
    sentidoComplemento: null,
    fontes: FONTES_SAUDE,
    notaOrigem: null,
    // O estoque é sempre o de hoje: em ano encerrado o card avisa.
    notaPeriodo:
      manchete && !params.isCurrentYear
        ? `Situação atual, não de ${params.ano}.`
        : null,
    apoio: manchete ? apoio : null,
    motivoAtencao,
    tom:
      farmaciaStatus === "apagao" ? "neutro" : tomDoCard(motivoAtencao, apoio),
    detailUrl: saudeDetailUrl,
  };
};

const contagemObras = (
  quantidade: number,
  singular: string,
  plural: string,
): string =>
  quantidade === 1 ? `1 ${singular}` : `${fmtNumber(quantidade)} ${plural}`;

/**
 * Manchete do card de obras. Com obra andando ou parada, a manchete é o que está
 * em andamento; sem nenhuma das duas, mostra as não iniciadas (ou as concluídas)
 * em vez de um "0 em andamento" vazio.
 */
const mancheteObras = (
  resumo: ResumoObrasDTO,
  temEtiqueta: boolean,
): { manchete: string; complemento: string | null } => {
  const { emExecucao, paralisadas, cadastradas, concluidas } = resumo;
  if (emExecucao > 0 || paralisadas > 0) {
    const paradas =
      paralisadas === 0
        ? "nenhuma parada"
        : contagemObras(paralisadas, "parada", "paradas");
    return {
      manchete: `${fmtNumber(emExecucao)} em andamento`,
      // Com a etiqueta, o motivo já diz quantas estão paradas; não repetir.
      complemento: temEtiqueta ? null : paradas,
    };
  }
  const concluidasTexto =
    concluidas > 0
      ? contagemObras(concluidas, "concluída", "concluídas")
      : null;
  if (cadastradas > 0) {
    return {
      manchete: contagemObras(cadastradas, "não iniciada", "não iniciadas"),
      complemento: concluidasTexto,
    };
  }
  return {
    manchete: concluidasTexto ?? "Nenhuma obra em andamento",
    complemento: null,
  };
};

const montarCardObras = (
  params: BuildSituacaoCidadeParams,
): SituacaoCidadeCardModel | null => {
  const { situacao, resumoObras, obrasDetailUrl } = params;
  if (!resumoObras || resumoObras.totalObras <= 0) return null;
  const { paralisadas } = resumoObras;
  const motivoAtencao = textoMotivo(situacao.obras, paralisadas);
  const { manchete, complemento } = mancheteObras(
    resumoObras,
    motivoAtencao !== null,
  );
  return {
    area: "obras",
    eyebrow: "Obras",
    pergunta: PERGUNTA_OBRAS,
    manchete,
    complemento,
    sentidoComplemento: null,
    fontes: FONTES_OBRAS,
    notaOrigem: null,
    notaPeriodo: null,
    apoio: null,
    motivoAtencao,
    tom: tomDoCard(motivoAtencao, null),
    detailUrl: obrasDetailUrl,
  };
};

const complementoIdeb = (resumo: EducacaoResumoCardData): string | null => {
  const anterior = resumo.notaAnteriorValorTexto;
  if (!anterior) return null;
  if (resumo.evolucaoTom === "neutro") return `Era ${anterior}`;
  return `era ${anterior}`;
};

const sentidoIdeb = (
  resumo: EducacaoResumoCardData,
): SentidoVariacao | null => {
  if (!resumo.notaAnteriorValorTexto) return null;
  if (resumo.evolucaoTom === "atencao") return "caiu";
  if (resumo.evolucaoTom === "destaque") return "subiu";
  return null;
};

export const ROTULO_SENTIDO: Record<SentidoVariacao, string> = {
  subiu: "subiu",
  caiu: "caiu",
};

const montarCardEducacao = (
  params: BuildSituacaoCidadeParams,
): SituacaoCidadeCardModel | null => {
  const { situacao, educacaoResumo, minimoEducacao, educacaoDetailUrl } =
    params;
  if (!temEducacaoDestaque(educacaoResumo)) return null;
  const apoio = montarApoioMinimo(
    "A Prefeitura aplica o mínimo exigido em educação?",
    situacao.educacao,
    minimoEducacao,
  );
  const motivoAtencao = textoMotivo(situacao.educacao, 0);
  const manchete = `Ideb ${educacaoResumo.notaIdebTexto}`;
  const complemento = complementoIdeb(educacaoResumo);
  const sentidoComplemento = sentidoIdeb(educacaoResumo);
  return {
    area: "educacao",
    eyebrow: "Educação",
    pergunta: PERGUNTA_EDUCACAO,
    manchete,
    complemento,
    sentidoComplemento,
    fontes: FONTES_EDUCACAO,
    notaOrigem: educacaoResumo.metaTexto
      ? `${educacaoResumo.metaTexto}.`
      : null,
    notaPeriodo: null,
    apoio,
    motivoAtencao,
    tom: tomDoCard(motivoAtencao, apoio),
    detailUrl: educacaoDetailUrl,
  };
};

/** Cards na ordem fixa Saúde, Obras, Educação; área sem dado não gera card. */
export function buildSituacaoCidadeCards(
  params: BuildSituacaoCidadeParams,
): SituacaoCidadeCardModel[] {
  return [
    montarCardSaude(params),
    montarCardObras(params),
    montarCardEducacao(params),
  ].filter((card): card is SituacaoCidadeCardModel => card !== null);
}
