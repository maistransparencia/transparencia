import type {
  FarmaciaIndiceDTO,
  FarmaciaIndiceMedicamentoDTO,
  FarmaciaSentinelaDTO,
} from "@transparencia/db";
import { fmtDate, fmtNumber, toTitleCase } from "@transparencia/ui";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { isValidMapCoordinate } from "@/lib/tile-calc";
import type { loadFarmaciaData } from "./loader";

export const FARMACIA_BUSCA_MINIMO_CARACTERES = 2;

/** Quantas letras o índice A–Z revela por vez e quantos itens uma letra revela por vez. */
export const FARMACIA_INDICE_PASSO_LETRAS = 6;
export const FARMACIA_INDICE_PASSO_ITENS = 25;
/** A–Z mais o grupo "0-9". */
export const FARMACIA_INDICE_MAXIMO_LETRAS = 27;
export const FARMACIA_INDICE_MAXIMO_ITENS = 1000;

type FarmaciaRawData = Awaited<ReturnType<typeof loadFarmaciaData>>;

export const LEI_FARMACIA_SUS_URL = urlLegislacao("lei14654");
export const LEI_ORGANICA_SAUDE_URL = urlLegislacao("lei8080");

/** Âncora da seção de resultados: leva o usuário direto à resposta da busca. */
export const ID_SECAO_RESULTADOS = "resultados";

/** Âncora do índice A–Z: mantém o usuário na seção ao trocar de letra ou revelar mais. */
export const ID_SECAO_INDICE = "indice";

function buildFarmaciaHref(portalSlug: string, busca: string): string {
  const base = `/${portalSlug}/farmacia`;
  return busca
    ? `${base}?${new URLSearchParams({ q: busca }).toString()}#${ID_SECAO_RESULTADOS}`
    : base;
}

export const FARMACIA_EXEMPLOS_MAXIMO = 6;

export interface FarmaciaExemplo {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  href: string;
}

/**
 * Remédios comuns (curadoria no seed) que têm estoque informado em alguma
 * unidade, como atalhos de busca no card da Visão Geral.
 */
export function buildExemplosFarmacia(
  sentinelas: FarmaciaSentinelaDTO[],
  detailUrl: string,
): FarmaciaExemplo[] {
  return sentinelas
    .filter((s) => s.destaqueCardInicial && s.unidadesComRegistro > 0)
    .toSorted((a, b) => a.ordemExibicao - b.ordemExibicao)
    .slice(0, FARMACIA_EXEMPLOS_MAXIMO)
    .map((s) => ({
      codigoPrincipioAtivo: s.codigoPrincipioAtivo,
      nomePrincipioAtivo: s.nomePrincipioAtivo,
      href: `${detailUrl}?${new URLSearchParams({ q: s.nomePrincipioAtivo }).toString()}#${ID_SECAO_RESULTADOS}`,
    }));
}

const ROTULOS_GRUPO_TERAPEUTICO: Record<string, string> = {
  cardiovascular: "Coração e pressão",
  diabetes: "Diabetes",
  dor_febre: "Dor e febre",
  antibiotico: "Antibióticos",
  gastrointestinal: "Estômago",
  respiratorio: "Pulmão e asma",
  endocrino: "Tireoide",
  saude_mental: "Saúde mental",
};

export type SituacaoPedido = "sem_registro" | "somente_vencido";

export type StatusEssencial =
  | "no_estoque"
  | "somente_vencido"
  | "somente_combinacao"
  | "sem_registro";

export const ROTULO_SEM_LOTE_VALIDO = "Sem lote dentro da validade na lista";

export interface FarmaciaEssencialItem {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  codigoCategoria: string;
  rotuloCategoria: string;
  status: StatusEssencial;
  /** Rótulo do estado sem lote válido; nulo nos demais. */
  rotuloSituacao: string | null;
  unidadesComRegistro: number;
  unidadesSomenteCombinacao: number;
  href: string;
  pedido: { texto: string; textoWhatsApp: string } | null;
}

function rotuloGrupoTerapeutico(codigo: string): string {
  return ROTULOS_GRUPO_TERAPEUTICO[codigo] ?? codigo.replaceAll("_", " ");
}

function statusEssencial(item: FarmaciaSentinelaDTO): StatusEssencial {
  if (item.unidadesComRegistro > 0) return "no_estoque";
  if (item.unidadesSomenteLoteVencido > 0) return "somente_vencido";
  if (item.unidadesSomenteCombinacao > 0) return "somente_combinacao";
  return "sem_registro";
}

function buildPedidosDoMedicamento(params: {
  nomeMedicamento: string;
  situacao: SituacaoPedido;
  portalName: string;
  dataPosicaoMaisRecente: string | null;
}): { texto: string; textoWhatsApp: string } {
  return {
    texto: buildPedidoEsclarecimento(params),
    textoWhatsApp: buildTextoWhatsAppPedido(params),
  };
}

function buildEssenciais(
  portalSlug: string,
  sentinelas: FarmaciaSentinelaDTO[],
  contextoPedido: ContextoPedido,
): FarmaciaEssencialItem[] {
  return sentinelas.map((item) => {
    const status = statusEssencial(item);
    return {
      codigoPrincipioAtivo: item.codigoPrincipioAtivo,
      nomePrincipioAtivo: item.nomePrincipioAtivo,
      codigoCategoria: item.grupoTerapeutico,
      rotuloCategoria: rotuloGrupoTerapeutico(item.grupoTerapeutico),
      status,
      rotuloSituacao:
        status === "somente_vencido" ? ROTULO_SEM_LOTE_VALIDO : null,
      unidadesComRegistro: item.unidadesComRegistro,
      unidadesSomenteCombinacao: item.unidadesSomenteCombinacao,
      href: buildFarmaciaHref(portalSlug, item.nomePrincipioAtivo),
      pedido:
        status === "sem_registro" || status === "somente_vencido"
          ? buildPedidosDoMedicamento({
              nomeMedicamento: item.nomePrincipioAtivo,
              situacao: status,
              ...contextoPedido,
            })
          : null,
    };
  });
}

function buildCategoriasEssenciais(essenciais: FarmaciaEssencialItem[]) {
  return essenciais.reduce<{ codigo: string; rotulo: string }[]>(
    (acc, item) =>
      acc.some((c) => c.codigo === item.codigoCategoria)
        ? acc
        : [
            ...acc,
            { codigo: item.codigoCategoria, rotulo: item.rotuloCategoria },
          ],
    [],
  );
}

export interface FarmaciaIndicador {
  codigo: string;
  rotulo: string;
  valor: string;
  nota: string | null;
  notaAtencao: boolean;
  /** Explicação recolhida: não estica o card, e o texto diz o que o dado não mostra. */
  detalhe?: { resumo: string; paragrafos: string[] } | null;
}

function buildIndicadoresEstoque(
  raw: FarmaciaRawData,
  dataAtualizacao: string | null,
): FarmaciaIndicador[] {
  const { sentinelas } = raw;
  const { indicadores, totalUnidadesAtivas } = sentinelas;
  if (totalUnidadesAtivas === 0) return [];

  const partesNotaEssenciais = [
    indicadores.essenciaisSemRegistro > 0
      ? `${fmtNumber(indicadores.essenciaisSemRegistro)} não aparece${indicadores.essenciaisSemRegistro > 1 ? "m" : ""} na lista de estoque`
      : null,
    indicadores.essenciaisSomenteCombinacao > 0
      ? `${fmtNumber(indicadores.essenciaisSomenteCombinacao)} só em combinação`
      : null,
    indicadores.essenciaisSomenteLoteVencido > 0
      ? `${fmtNumber(indicadores.essenciaisSomenteLoteVencido)} só com lote vencido`
      : null,
  ].filter((parte): parte is string => parte !== null);

  const cartoes: (FarmaciaIndicador | null)[] = [
    {
      codigo: "unidades_informaram",
      rotulo: "Unidades que informaram estoque",
      valor: fmtNumber(totalUnidadesAtivas),
      nota: "Enviaram a lista mais recente",
      notaAtencao: false,
    },
    indicadores.totalEssenciais > 0
      ? {
          codigo: "essenciais_no_estoque",
          rotulo: "Essenciais na lista de estoque",
          valor: `${fmtNumber(indicadores.essenciaisNoEstoque)} de ${fmtNumber(indicadores.totalEssenciais)}`,
          nota:
            partesNotaEssenciais.length > 0
              ? partesNotaEssenciais.join(" · ")
              : "Todos aparecem na lista de estoque",
          notaAtencao: partesNotaEssenciais.length > 0,
        }
      : null,
    dataAtualizacao
      ? {
          codigo: "ultima_atualizacao",
          rotulo: "Lista de estoque mais recente",
          valor: fmtDate(dataAtualizacao),
          nota: null,
          notaAtencao: false,
        }
      : null,
  ];
  return cartoes.filter((c): c is FarmaciaIndicador => c !== null);
}

const AVISO_CONTEXTO_LOTES_VENCIDOS =
  "Isto mostra o que consta na lista de estoque enviada pela farmácia. Não significa que o remédio vencido foi entregue nem que está disponível.";

function rotuloContagem(
  total: number,
  singular: string,
  plural: string,
): string {
  return `${fmtNumber(total)} ${total === 1 ? singular : plural}`;
}

function buildIndicadorLotesAVencer(
  lotes: FarmaciaRawData["lotesAVencer"],
): FarmaciaIndicador[] {
  if (!lotes || lotes.totalLotesComValidade === 0) return [];
  const detalheAVencer =
    lotes.totalLotesAVencer === 0
      ? `Nenhum vence em até ${fmtNumber(lotes.janelaDias)} dias`
      : [
          `${rotuloContagem(lotes.totalLotesAVencer, "lote", "lotes")}, de ${rotuloContagem(lotes.totalRemediosAVencer, "remédio", "remédios diferentes")}.`,
          lotes.dataVencimentoMaisProxima
            ? `O primeiro vence em ${fmtDate(lotes.dataVencimentoMaisProxima)}.`
            : null,
        ]
          .filter((parte): parte is string => parte !== null)
          .join(" ");
  const detalheSomenteVencidos =
    lotes.totalRemediosSomenteVencidos > 0
      ? `Na lista de estoque mais recente, ${rotuloContagem(lotes.totalRemediosSomenteVencidos, "remédio tem só lote", "remédios têm só lotes")} com a validade vencida (${rotuloContagem(lotes.totalLotesRemediosSomenteVencidos, "lote", "lotes")}).`
      : null;
  return [
    {
      codigo: "lotes_a_vencer",
      rotulo: `Lotes que vencem em até ${fmtNumber(lotes.janelaDias)} dias`,
      valor: fmtNumber(lotes.totalLotesAVencer),
      nota: detalheAVencer,
      notaAtencao:
        lotes.totalLotesAVencer > 0 || lotes.totalRemediosSomenteVencidos > 0,
      detalhe: detalheSomenteVencidos
        ? {
            resumo: `${rotuloContagem(lotes.totalRemediosSomenteVencidos, "remédio", "remédios")} só com lote vencido`,
            paragrafos: [detalheSomenteVencidos, AVISO_CONTEXTO_LOTES_VENCIDOS],
          }
        : null,
    },
  ];
}

function buildIndicadores(
  raw: FarmaciaRawData,
  dataAtualizacao: string | null,
): FarmaciaIndicador[] {
  return [
    ...buildIndicadoresEstoque(raw, dataAtualizacao),
    ...buildIndicadorLotesAVencer(raw.lotesAVencer),
  ];
}

export function buildTelefoneHref(telefone: string | null): string | null {
  const primeiro = telefone?.split(/[/;,]/)[0] ?? "";
  const numero = primeiro.replace(/[^\d+]/g, "");
  return numero.replace(/\D/g, "").length >= 8 ? `tel:${numero}` : null;
}

function formatarNomeMedicamento(nome: string): string {
  if (nome !== nome.toUpperCase()) return nome;
  const minusculo = nome.toLowerCase();
  return `${minusculo.charAt(0).toUpperCase()}${minusculo.slice(1)}`;
}

function buildResumoBusca(params: {
  totalApresentacoes: number;
  totalUnidades: number;
  totalUnidadesAtivas: number;
}): string {
  const remedios = `${fmtNumber(params.totalApresentacoes)} ${params.totalApresentacoes === 1 ? "remédio" : "remédios"}`;
  const unidades =
    params.totalUnidadesAtivas > 0
      ? `${fmtNumber(params.totalUnidades)} de ${fmtNumber(params.totalUnidadesAtivas)} unidades`
      : `${fmtNumber(params.totalUnidades)} ${params.totalUnidades === 1 ? "unidade" : "unidades"}`;
  return `${remedios} em ${unidades}`;
}

export function buildFatoApagao(
  dataPosicaoMaisRecente: string | null,
  diasDesdePosicaoMaisRecente: number | null,
): string {
  if (dataPosicaoMaisRecente && diasDesdePosicaoMaisRecente != null) {
    return `a última posição de estoque de medicamentos divulgada nos dados oficiais do Ministério da Saúde (BNAFAR/Hórus) é de ${fmtDate(dataPosicaoMaisRecente)}, há ${diasDesdePosicaoMaisRecente} dias`;
  }
  return "não consta divulgação recente da posição de estoque de medicamentos nos dados oficiais do Ministério da Saúde (BNAFAR/Hórus)";
}

/** `displayName` vem como "Prefeitura de X"; o pedido e o requerimento citam só o município. */
export function nomeMunicipioDoPortal(portalName: string): string {
  return portalName
    .replace(/^Prefeitura\s+(?:Municipal\s+)?d[aeo]s?\s+/i, "")
    .trim();
}

function destinatarioDoMunicipio(portalName: string): string {
  const nome = nomeMunicipioDoPortal(portalName);
  return nome ? `de ${nome}` : "do município";
}

export function buildRequerimentoFiscalizacao(params: {
  portalName: string;
  dataPosicaoMaisRecente: string | null;
  diasDesdePosicaoMaisRecente: number | null;
}): string {
  const fato = buildFatoApagao(
    params.dataPosicaoMaisRecente,
    params.diasDesdePosicaoMaisRecente,
  );
  return [
    "REQUERIMENTO DE FISCALIZAÇÃO - DISPONIBILIDADE DE MEDICAMENTOS NA FARMÁCIA SUS",
    "",
    `Aos gabinetes de vereadores, ao Ministério Público e à Ouvidoria ${destinatarioDoMunicipio(params.portalName)}.`,
    "",
    `Considerando o Art. 6º-A da Lei nº 8.080/1990 (${LEI_ORGANICA_SAUDE_URL}) e a Lei nº 14.654/2023 (${LEI_FARMACIA_SUS_URL}), que tratam da divulgação da disponibilidade de medicamentos;`,
    "",
    `Considerando que ${fato};`,
    "",
    "Requeiro a apuração de possível descumprimento da obrigação de divulgação quinzenal e que sejam prestadas as seguintes informações:",
    "1. O motivo da ausência de divulgação atualizada do estoque de medicamentos;",
    "2. As providências adotadas para regularizar a transmissão dos dados;",
    "3. O prazo para a divulgação periódica da disponibilidade de medicamentos nas unidades de saúde.",
    "",
    "Nestes termos, aguardo resposta.",
  ].join("\n");
}

export function buildPedidoEsclarecimento(params: {
  portalName: string;
  nomeMedicamento: string;
  dataPosicaoMaisRecente: string | null;
  situacao?: SituacaoPedido;
}): string {
  const destinatario = destinatarioDoMunicipio(params.portalName);
  const posicao = params.dataPosicaoMaisRecente
    ? `Na posição de estoque divulgada em ${fmtDate(params.dataPosicaoMaisRecente)}`
    : "Na posição de estoque divulgada";
  return [
    `À Secretaria Municipal de Saúde ${destinatario}.`,
    "",
    `Com base nos arts. 10 e 11 da Lei nº 12.527/2011 (Lei de Acesso à Informação), solicito esclarecimento sobre o medicamento ${params.nomeMedicamento}. O art. 6º-A da Lei nº 8.080/1990, incluído pela Lei nº 14.654/2023, obriga a divulgação quinzenal e acessível dos estoques de medicamentos das farmácias públicas do SUS. ${posicao}, ${
      params.situacao === "somente_vencido"
        ? "todos os lotes desse item que constam na lista estão com a validade vencida. Peço informar se há lote desse medicamento dentro da validade em alguma unidade e, se não houver, a previsão de reposição."
        : "não consta registro de estoque informado para esse item. Peço informar se o medicamento está disponível e, caso não esteja, a previsão de reposição."
    }`,
  ].join("\n");
}

export function buildTextoWhatsAppPedido(params: {
  portalName: string;
  nomeMedicamento: string;
  situacao?: SituacaoPedido;
}): string {
  const situacao =
    params.situacao === "somente_vencido"
      ? "Na lista de estoque divulgada, todos os lotes desse remédio estão com a validade vencida."
      : "O remédio não aparece na lista de estoque divulgada.";
  return `Pedido de esclarecimento à Secretaria de Saúde ${destinatarioDoMunicipio(params.portalName)} sobre ${params.nomeMedicamento} na Farmácia SUS (Lei nº 14.654/2023). ${situacao} Confira:`;
}

export function buildTextoWhatsApp(params: {
  portalName: string;
  diasDesdePosicaoMaisRecente: number | null;
}): string {
  const municipio = params.portalName || "Este município";
  const detalhe =
    params.diasDesdePosicaoMaisRecente != null
      ? `A última posição de estoque divulgada tem ${params.diasDesdePosicaoMaisRecente} dias.`
      : "Não há divulgação recente da posição de estoque.";
  return `${municipio}: alerta sobre a disponibilidade de medicamentos na Farmácia SUS (Lei nº 14.654/2023). ${detalhe} Confira e fiscalize:`;
}

const LETRAS_DO_ALFABETO = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
/** Grupo dos nomes que não começam com letra; só vira chip quando existe. */
const LETRA_NUMEROS = "0-9";

function rotuloLetra(letra: string): string {
  return letra === LETRA_NUMEROS ? "0–9" : letra;
}

function buildIndiceHref(
  portalSlug: string,
  params: Record<string, string>,
): string {
  const base = `/${portalSlug}/farmacia`;
  const query = new URLSearchParams(params).toString();
  return `${base}${query ? `?${query}` : ""}#${ID_SECAO_INDICE}`;
}

function rotuloTotalMedicamentos(total: number): string {
  return `${fmtNumber(total)} ${total === 1 ? "remédio" : "remédios"}`;
}

function definirModoIndice(
  busca: string,
  letra: string,
): "resumo" | "letra" | "busca" {
  if (busca.length >= FARMACIA_BUSCA_MINIMO_CARACTERES) return "busca";
  return letra ? "letra" : "resumo";
}

interface ContextoPedido {
  portalName: string;
  dataPosicaoMaisRecente: string | null;
}

/** Remédio só com lote vencido deixa de ser link e passa a oferecer o pedido de esclarecimento. */
function buildLinhaMedicamentoIndice(
  portalSlug: string,
  medicamento: Pick<
    FarmaciaIndiceMedicamentoDTO,
    "nomeMedicamento" | "situacaoValidade"
  >,
  contextoPedido: ContextoPedido,
) {
  if (medicamento.situacaoValidade !== "somente_vencido") {
    return {
      href: buildFarmaciaHref(portalSlug, medicamento.nomeMedicamento),
      semLoteValido: null,
    };
  }
  return {
    href: null,
    semLoteValido: {
      rotulo: ROTULO_SEM_LOTE_VALIDO,
      caminhoCompartilhamento: buildFarmaciaHref(
        portalSlug,
        medicamento.nomeMedicamento,
      ),
      pedido: buildPedidosDoMedicamento({
        nomeMedicamento: medicamento.nomeMedicamento,
        situacao: "somente_vencido",
        ...contextoPedido,
      }),
    },
  };
}

export function buildIndiceAz(params: {
  portalSlug: string;
  indice: FarmaciaIndiceDTO | null;
  context: Pick<
    FarmaciaRawData["context"],
    "busca" | "letra" | "letrasVisiveis" | "itensVisiveis"
  >;
  totalUnidadesAtivas: number;
  passoLetras: number;
  passoItens: number;
  contextoPedido: ContextoPedido;
}) {
  const { portalSlug, indice, context, contextoPedido } = params;
  if (!indice || indice.letrasDisponiveis.length === 0) return null;

  const modo = definirModoIndice(context.busca, context.letra);
  const letraSelecionada = modo === "letra" ? context.letra : null;
  const hrefResumo = buildIndiceHref(portalSlug, {});
  const disponiveis = new Set(indice.letrasDisponiveis);

  const chips = [
    {
      codigo: "todas",
      rotulo: "A–Z",
      href: hrefResumo,
      ativo: modo === "resumo",
    },
    ...[
      ...LETRAS_DO_ALFABETO,
      ...(disponiveis.has(LETRA_NUMEROS) ? [LETRA_NUMEROS] : []),
    ].map((letra) => ({
      codigo: letra,
      rotulo: rotuloLetra(letra),
      href: disponiveis.has(letra)
        ? buildIndiceHref(portalSlug, { letra })
        : null,
      ativo: letra === letraSelecionada,
    })),
  ];

  const grupos = indice.letras.map((l) => ({
    letra: l.letra,
    rotuloLetra: rotuloLetra(l.letra),
    rotuloTotal: rotuloTotalMedicamentos(l.totalMedicamentos),
    medicamentos: l.medicamentos.map((m) => ({
      nomeMedicamento: formatarNomeMedicamento(m.nomeMedicamento),
      unidadesComEstoque: m.unidadesComEstoque,
      ...buildLinhaMedicamentoIndice(portalSlug, m, contextoPedido),
    })),
    hrefTodos: buildIndiceHref(portalSlug, { letra: l.letra }),
    rotuloTodos: `Ver todos com ${rotuloLetra(l.letra)}`,
  }));

  const faltamLetras = indice.totalLetras - indice.letras.length;
  const letra = indice.letras[0];
  const faltamItens = letra
    ? letra.totalMedicamentos - letra.medicamentos.length
    : 0;
  const proximoPasso = (() => {
    if (modo === "resumo")
      return {
        faltam: faltamLetras,
        visiveis: context.letrasVisiveis,
        maximo: FARMACIA_INDICE_MAXIMO_LETRAS,
        unidade: ["letra", "letras"] as const,
        passo: params.passoLetras,
        href: buildIndiceHref(portalSlug, {
          letras: String(context.letrasVisiveis + params.passoLetras),
        }),
      };
    return {
      faltam: faltamItens,
      visiveis: context.itensVisiveis,
      maximo: FARMACIA_INDICE_MAXIMO_ITENS,
      unidade: ["remédio", "remédios"] as const,
      passo: params.passoItens,
      href: buildIndiceHref(portalSlug, {
        letra: context.letra,
        itens: String(context.itensVisiveis + params.passoItens),
      }),
    };
  })();
  const quantosRevela = Math.min(proximoPasso.passo, proximoPasso.faltam);

  return {
    chips,
    modo,
    letraSelecionada,
    rotuloLetraSelecionada: letraSelecionada
      ? rotuloLetra(letraSelecionada)
      : null,
    totalUnidades: Math.max(
      params.totalUnidadesAtivas || indice.totalUnidades,
      ...indice.letras.flatMap((l) =>
        l.medicamentos.map((m) => m.unidadesComEstoque),
      ),
    ),
    grupos,
    rotuloTotalLetra: letra
      ? rotuloTotalMedicamentos(letra.totalMedicamentos)
      : "",
    rotuloProgresso: (() => {
      if (modo === "resumo")
        return `Mostrando ${fmtNumber(indice.letras.length)} de ${fmtNumber(indice.totalLetras)} letras`;
      return letra
        ? `Mostrando ${fmtNumber(letra.medicamentos.length)} de ${fmtNumber(letra.totalMedicamentos)}`
        : "";
    })(),
    hrefMais:
      proximoPasso.faltam > 0 && proximoPasso.visiveis < proximoPasso.maximo
        ? proximoPasso.href
        : null,
    rotuloMais: `Ver mais ${fmtNumber(quantosRevela)} ${quantosRevela === 1 ? proximoPasso.unidade[0] : proximoPasso.unidade[1]}`,
    hrefResumo,
  };
}

export function buildFarmaciaViewModel(raw: FarmaciaRawData) {
  const { farmacia, context, portalSlug, portalName, sentinelas, indice } = raw;
  const formAction = `/${portalSlug}/farmacia`;
  const hasBusca = context.busca.length >= FARMACIA_BUSCA_MINIMO_CARACTERES;
  const hasBuscaCurta = context.busca.length > 0 && !hasBusca;
  const dataAtualizacao =
    farmacia.dataPosicaoMaisRecente ?? farmacia.dataColeta;

  const unidades = farmacia.unidades.map((u, indice) => ({
    numero: indice + 1,
    idUnidade: u.idUnidade,
    nomeUnidade: toTitleCase(u.nomeUnidade),
    enderecoUnidade: u.enderecoUnidade,
    telefoneUnidade: u.telefoneUnidade,
    telefoneHref: buildTelefoneHref(u.telefoneUnidade),
    totalQuantidadeEstoque: u.totalQuantidadeEstoque,
    latitudeUnidade: u.latitudeUnidade,
    longitudeUnidade: u.longitudeUnidade,
    medicamentos: u.medicamentos.map((m) => ({
      nomeMedicamento: formatarNomeMedicamento(m.nomeMedicamento),
      quantidadeEstoque: m.quantidadeEstoque,
    })),
  }));
  const unidadePorId = new Map(unidades.map((u) => [u.idUnidade, u]));

  const remedios = farmacia.remedios.map((r) => {
    const maiorQuantidade = r.unidades[0]?.quantidadeEstoque ?? 0;
    return {
      nomeMedicamento: formatarNomeMedicamento(r.nomeMedicamento),
      totalQuantidadeEstoque: r.totalQuantidadeEstoque,
      totalUnidadesComEstoque: r.totalUnidadesComEstoque,
      unidades: r.unidades.flatMap((item) => {
        const unidade = unidadePorId.get(item.idUnidade);
        if (!unidade) return [];
        return [
          {
            numero: unidade.numero,
            idUnidade: unidade.idUnidade,
            nomeUnidade: unidade.nomeUnidade,
            quantidadeEstoque: item.quantidadeEstoque,
            percentualBarra:
              maiorQuantidade > 0
                ? Math.max(
                    2,
                    Math.round(
                      (item.quantidadeEstoque / maiorQuantidade) * 100,
                    ),
                  )
                : 2,
          },
        ];
      }),
    };
  });

  const essenciais = buildEssenciais(portalSlug, sentinelas.sentinelas, {
    portalName,
    dataPosicaoMaisRecente: farmacia.dataPosicaoMaisRecente,
  });

  return {
    portalSlug,
    portalName,
    status: farmacia.status,
    dataPosicaoMaisRecente: farmacia.dataPosicaoMaisRecente,
    diasDesdePosicaoMaisRecente: farmacia.diasDesdePosicaoMaisRecente,
    dataAtualizacao,
    busca: context.busca,
    hasBusca,
    hasBuscaCurta,
    formAction,
    exemplos: buildExemplosFarmacia(sentinelas.sentinelas, formAction),
    indiceAz: buildIndiceAz({
      portalSlug,
      indice,
      context,
      totalUnidadesAtivas: sentinelas.totalUnidadesAtivas,
      passoLetras: FARMACIA_INDICE_PASSO_LETRAS,
      passoItens: FARMACIA_INDICE_PASSO_ITENS,
      contextoPedido: {
        portalName,
        dataPosicaoMaisRecente: farmacia.dataPosicaoMaisRecente,
      },
    }),
    medicamentosSemLoteValido: (farmacia.medicamentosSemLoteValido ?? []).map(
      (nome) => ({
        nomeMedicamento: formatarNomeMedicamento(nome),
        href: buildFarmaciaHref(portalSlug, nome),
        rotulo: ROTULO_SEM_LOTE_VALIDO,
        pedido: buildPedidosDoMedicamento({
          nomeMedicamento: nome,
          situacao: "somente_vencido",
          portalName,
          dataPosicaoMaisRecente: farmacia.dataPosicaoMaisRecente,
        }),
      }),
    ),
    indicadores: buildIndicadores(raw, dataAtualizacao),
    resumoBusca: buildResumoBusca({
      totalApresentacoes: farmacia.totalApresentacoes,
      totalUnidades: farmacia.totalUnidades,
      totalUnidadesAtivas: sentinelas.totalUnidadesAtivas,
    }),
    unidades,
    remedios,
    mapMarkers: unidades
      .filter((u) =>
        isValidMapCoordinate(u.latitudeUnidade, u.longitudeUnidade),
      )
      .map((u) => ({
        id: u.idUnidade,
        numero: u.numero,
        nome: u.nomeUnidade,
        latitude: u.latitudeUnidade as number,
        longitude: u.longitudeUnidade as number,
      })),
    totalUnidadesAtivas: sentinelas.totalUnidadesAtivas,
    essenciais,
    categoriasEssenciais: buildCategoriasEssenciais(essenciais),
    requerimento: buildRequerimentoFiscalizacao({
      portalName,
      dataPosicaoMaisRecente: farmacia.dataPosicaoMaisRecente,
      diasDesdePosicaoMaisRecente: farmacia.diasDesdePosicaoMaisRecente,
    }),
    textoWhatsApp: buildTextoWhatsApp({
      portalName,
      diasDesdePosicaoMaisRecente: farmacia.diasDesdePosicaoMaisRecente,
    }),
  };
}
