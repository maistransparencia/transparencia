import type {
  MotivoAtencaoArea,
  ResumoObrasDTO,
  SituacaoAreaDTO,
  SituacaoHomeDTO,
} from "@transparencia/db";
import { fmtNumber, fmtPercent } from "@transparencia/ui";
import type { EducacaoResumoCardData } from "@/components/educacao-resumo-card";
import { temEducacaoDestaque } from "@/lib/educacao-destaque";

export type AreaSituacao = "saude" | "obras" | "educacao";
export type StatusFarmaciaCard = "conforme" | "apagao" | "indisponivel";
export type TomCardSituacao = "neutro" | "atencao";
export type EstadoApoioMinimo = "normal" | "parcial" | "abaixo";

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
  /** Largura da barra aplicada, em % da escala visual. */
  barraPercentual: number;
  /** Posição do traço do mínimo, em % da escala visual. */
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
  /** Complemento da manchete (ex.: "▼ era 5,4"); `null` quando não há. */
  complemento: string | null;
  notaOrigem: string;
  apoio: ApoioMinimoModel | null;
  /** Motivo escrito da etiqueta "Merece atenção"; `null` = sem etiqueta. */
  motivoAtencao: string | null;
  tom: TomCardSituacao;
  detailUrl: string;
  textoCompartilhar: string;
}

export interface BuildSituacaoCidadeParams {
  situacao: SituacaoHomeDTO;
  ano: number;
  farmaciaStatus: StatusFarmaciaCard;
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

const ESCALA_BARRA_FOLGA = 1.25;

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
  const escala = Math.max(aplicado, limite, 1) * ESCALA_BARRA_FOLGA;
  return {
    pergunta,
    estado,
    texto: textos[estado],
    barraPercentual: Math.min((aplicado / escala) * 100, 100),
    tracoMinimoPercentual: Math.min((limite / escala) * 100, 100),
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

const montarTextoCompartilhar = ({
  pergunta,
  resposta,
  ano,
  fonte,
}: {
  pergunta: string;
  resposta: string;
  ano: number;
  fonte: string;
}): string => `${pergunta} ${resposta} Dados de ${ano}. Fonte: ${fonte}.`;

const FONTE_SAUDE = "BNAFAR e SIOPS, Ministério da Saúde";
const FONTE_OBRAS = "ObrasGov.br";
const FONTE_EDUCACAO = "Inep (Ideb) e SIOPE";

const PERGUNTA_SAUDE = "Tem remédio no posto de saúde?";
const PERGUNTA_OBRAS = "As obras da cidade estão andando?";
const PERGUNTA_EDUCACAO = "A educação da cidade está melhorando?";

const mancheteSaude = (status: StatusFarmaciaCard): string | null => {
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
  const { situacao, ano, farmaciaStatus, minimoSaude, saudeDetailUrl } = params;
  const apoio = montarApoioMinimo(
    "A Prefeitura aplica o mínimo exigido em saúde?",
    situacao.saude,
    minimoSaude,
  );
  const manchete = mancheteSaude(farmaciaStatus);
  if (!manchete && !apoio) return null;
  const motivoAtencao = textoMotivo(situacao.saude, 0);
  const resposta = manchete ?? apoio?.texto ?? "";
  return {
    area: "saude",
    eyebrow: "Saúde",
    pergunta: manchete ? PERGUNTA_SAUDE : (apoio?.pergunta ?? PERGUNTA_SAUDE),
    manchete: manchete ?? apoio?.texto ?? null,
    complemento: null,
    notaOrigem: `Fonte: ${FONTE_SAUDE}.`,
    apoio: manchete ? apoio : null,
    motivoAtencao,
    tom:
      farmaciaStatus === "apagao" ? "neutro" : tomDoCard(motivoAtencao, apoio),
    detailUrl: saudeDetailUrl,
    textoCompartilhar: montarTextoCompartilhar({
      pergunta: PERGUNTA_SAUDE,
      resposta: `${resposta}${resposta.endsWith(".") ? "" : "."}`,
      ano,
      fonte: FONTE_SAUDE,
    }),
  };
};

const montarCardObras = (
  params: BuildSituacaoCidadeParams,
): SituacaoCidadeCardModel | null => {
  const { situacao, ano, resumoObras, obrasDetailUrl } = params;
  if (!resumoObras || resumoObras.totalObras <= 0) return null;
  const { emExecucao, paralisadas } = resumoObras;
  const andamento = `${fmtNumber(emExecucao)} em andamento`;
  const paradas =
    paralisadas === 1 ? "1 parada" : `${fmtNumber(paralisadas)} paradas`;
  const resposta = `${andamento} e ${paradas}.`;
  const motivoAtencao = textoMotivo(situacao.obras, paralisadas);
  return {
    area: "obras",
    eyebrow: "Obras",
    pergunta: PERGUNTA_OBRAS,
    manchete: andamento,
    complemento: paradas,
    notaOrigem: `Fonte: ${FONTE_OBRAS}.`,
    apoio: null,
    motivoAtencao,
    tom: tomDoCard(motivoAtencao, null),
    detailUrl: obrasDetailUrl,
    textoCompartilhar: montarTextoCompartilhar({
      pergunta: PERGUNTA_OBRAS,
      resposta: resposta,
      ano,
      fonte: FONTE_OBRAS,
    }),
  };
};

const complementoIdeb = (resumo: EducacaoResumoCardData): string | null => {
  const anterior = resumo.notaAnteriorValorTexto;
  if (!anterior) return null;
  const seta = resumo.evolucaoTom === "atencao" ? "▼" : "▲";
  if (resumo.evolucaoTom === "neutro") return `Era ${anterior}`;
  return `${seta} era ${anterior}`;
};

const montarCardEducacao = (
  params: BuildSituacaoCidadeParams,
): SituacaoCidadeCardModel | null => {
  const { situacao, ano, educacaoResumo, minimoEducacao, educacaoDetailUrl } =
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
  const resposta = `${manchete}${complemento ? ` (${complemento})` : ""}.`;
  return {
    area: "educacao",
    eyebrow: "Educação",
    pergunta: PERGUNTA_EDUCACAO,
    manchete,
    complemento,
    notaOrigem: `Fonte: ${FONTE_EDUCACAO}.${educacaoResumo.metaTexto ? ` ${educacaoResumo.metaTexto}.` : ""}`,
    apoio,
    motivoAtencao,
    tom: tomDoCard(motivoAtencao, apoio),
    detailUrl: educacaoDetailUrl,
    textoCompartilhar: montarTextoCompartilhar({
      pergunta: PERGUNTA_EDUCACAO,
      resposta: resposta,
      ano,
      fonte: FONTE_EDUCACAO,
    }),
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

/** Colunas no desktop: 3 (3 cards) ou 2 (2 cards); nunca 2+1. */
export const CLASSE_GRADE_POR_QUANTIDADE: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 lg:grid-cols-2",
  3: "grid-cols-1 lg:grid-cols-3",
};
