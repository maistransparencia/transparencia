import type { FarmaciaSentinelaDTO } from "@transparencia/db";
import { fmtDate, fmtNumber, toTitleCase } from "@transparencia/ui";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { isValidMapCoordinate } from "@/lib/tile-calc";
import type { loadFarmaciaData } from "./loader";

export const FARMACIA_BUSCA_MINIMO_CARACTERES = 2;

type FarmaciaRawData = Awaited<ReturnType<typeof loadFarmaciaData>>;

export const LEI_FARMACIA_SUS_URL = urlLegislacao("lei14654");
export const LEI_ORGANICA_SAUDE_URL = urlLegislacao("lei8080");

/** Âncora da seção de resultados: leva o usuário direto à resposta da busca. */
export const ID_SECAO_RESULTADOS = "resultados";

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

export type StatusEssencial =
  | "no_estoque"
  | "somente_combinacao"
  | "sem_registro";

export interface FarmaciaEssencialItem {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  codigoCategoria: string;
  rotuloCategoria: string;
  status: StatusEssencial;
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
  if (item.unidadesSomenteCombinacao > 0) return "somente_combinacao";
  return "sem_registro";
}

function buildEssenciais(
  portalSlug: string,
  sentinelas: FarmaciaSentinelaDTO[],
  contextoPedido: { portalName: string; dataPosicaoMaisRecente: string | null },
): FarmaciaEssencialItem[] {
  return sentinelas.map((item) => {
    const status = statusEssencial(item);
    return {
      codigoPrincipioAtivo: item.codigoPrincipioAtivo,
      nomePrincipioAtivo: item.nomePrincipioAtivo,
      codigoCategoria: item.grupoTerapeutico,
      rotuloCategoria: rotuloGrupoTerapeutico(item.grupoTerapeutico),
      status,
      unidadesComRegistro: item.unidadesComRegistro,
      unidadesSomenteCombinacao: item.unidadesSomenteCombinacao,
      href: buildFarmaciaHref(portalSlug, item.nomePrincipioAtivo),
      pedido:
        status === "sem_registro"
          ? {
              texto: buildPedidoEsclarecimento({
                portalName: contextoPedido.portalName,
                nomeMedicamento: item.nomePrincipioAtivo,
                dataPosicaoMaisRecente: contextoPedido.dataPosicaoMaisRecente,
              }),
              textoWhatsApp: buildTextoWhatsAppPedido({
                portalName: contextoPedido.portalName,
                nomeMedicamento: item.nomePrincipioAtivo,
              }),
            }
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

function buildIndicadorLotesAVencer(
  lotes: FarmaciaRawData["lotesAVencer"],
): FarmaciaIndicador[] {
  if (!lotes || lotes.totalLotesComValidade === 0) return [];
  const detalheAVencer =
    lotes.totalLotesAVencer === 0
      ? `Nenhum vence em até ${fmtNumber(lotes.janelaDias)} dias`
      : [
          `${fmtNumber(lotes.totalRemediosAVencer)} ${lotes.totalRemediosAVencer === 1 ? "remédio" : "remédios"}`,
          lotes.dataVencimentoMaisProxima
            ? `o primeiro vence em ${fmtDate(lotes.dataVencimentoMaisProxima)}`
            : null,
        ]
          .filter((parte): parte is string => parte !== null)
          .join(" · ");
  const detalheVencidos =
    lotes.totalLotesVencidosComSaldo > 0
      ? `${fmtNumber(lotes.totalLotesVencidosComSaldo)} ${lotes.totalLotesVencidosComSaldo === 1 ? "lote já consta como vencido" : "lotes já constam como vencidos"} na posição de estoque divulgada`
      : null;
  const nota = [detalheAVencer, detalheVencidos]
    .filter((parte): parte is string => parte !== null)
    .join(" · ");
  return [
    {
      codigo: "lotes_a_vencer",
      rotulo: `Lotes que vencem em até ${fmtNumber(lotes.janelaDias)} dias`,
      valor: fmtNumber(lotes.totalLotesAVencer),
      nota,
      notaAtencao:
        lotes.totalLotesAVencer > 0 || lotes.totalLotesVencidosComSaldo > 0,
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

export function buildRequerimentoFiscalizacao(params: {
  portalName: string;
  dataPosicaoMaisRecente: string | null;
  diasDesdePosicaoMaisRecente: number | null;
}): string {
  const municipio = params.portalName || "o município";
  const fato = buildFatoApagao(
    params.dataPosicaoMaisRecente,
    params.diasDesdePosicaoMaisRecente,
  );
  return [
    "REQUERIMENTO DE FISCALIZAÇÃO - DISPONIBILIDADE DE MEDICAMENTOS NA FARMÁCIA SUS",
    "",
    `Aos gabinetes de vereadores, ao Ministério Público e à Ouvidoria de ${municipio}.`,
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
}): string {
  const destinatario = params.portalName
    ? `de ${params.portalName}`
    : "do município";
  const posicao = params.dataPosicaoMaisRecente
    ? `Na posição de estoque divulgada em ${fmtDate(params.dataPosicaoMaisRecente)}`
    : "Na posição de estoque divulgada";
  return [
    `À Secretaria Municipal de Saúde ${destinatario}.`,
    "",
    `Com base nos arts. 10 e 11 da Lei nº 12.527/2011 (Lei de Acesso à Informação) e no art. 6º-A da Lei nº 8.080/1990, incluído pela Lei nº 14.654/2023, que obriga a divulgação quinzenal e acessível dos estoques de medicamentos das farmácias públicas do SUS, solicito esclarecimento sobre o medicamento ${params.nomeMedicamento}. ${posicao}, não consta registro de estoque informado para esse item. Peço informar se o medicamento está disponível e, caso não esteja, a previsão de reposição.`,
  ].join("\n");
}

export function buildTextoWhatsAppPedido(params: {
  portalName: string;
  nomeMedicamento: string;
}): string {
  const municipio = params.portalName || "Este município";
  return `${municipio}: pedido de esclarecimento sobre ${params.nomeMedicamento} na Farmácia SUS (Lei nº 14.654/2023). O item não consta na lista de estoque divulgada. Confira:`;
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

export function buildFarmaciaViewModel(raw: FarmaciaRawData) {
  const { farmacia, context, portalSlug, portalName, sentinelas } = raw;
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
