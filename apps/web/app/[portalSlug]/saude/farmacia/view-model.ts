import { fmtDate } from "@transparencia/ui";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { isValidMapCoordinate } from "@/lib/tile-calc";
import type { loadFarmaciaData } from "./loader";
import {
  FARMACIA_LIMITE_MAXIMO_UNIDADES,
  FARMACIA_UNIDADES_POR_PAGINA,
} from "./loader";

export const FARMACIA_BUSCA_MINIMO_CARACTERES = 2;

type FarmaciaRawData = Awaited<ReturnType<typeof loadFarmaciaData>>;

export const LEI_FARMACIA_SUS_URL = urlLegislacao("lei14654");
export const LEI_ORGANICA_SAUDE_URL = urlLegislacao("lei8080");

function buildFarmaciaHref(
  portalSlug: string,
  params: { q?: string; unidade?: string | null; limite?: number },
): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.unidade) query.set("unidade", params.unidade);
  if (params.limite) query.set("limite", String(params.limite));
  const queryString = query.toString();
  const base = `/${portalSlug}/saude/farmacia`;
  return queryString ? `${base}?${queryString}` : base;
}

const ROTULOS_GRUPO_TERAPEUTICO: Record<string, string> = {
  cardiovascular: "Coração e pressão",
  diabetes: "Diabetes",
  dor_febre: "Dor e febre",
  antibiotico: "Antibióticos",
  gastrointestinal: "Estômago",
  respiratorio: "Respiração",
  endocrino: "Tireoide",
  saude_mental: "Saúde mental",
};

function buildGruposSentinelas(
  portalSlug: string,
  sentinelas: FarmaciaRawData["sentinelas"],
) {
  const grupos = sentinelas.sentinelas.reduce<
    Map<
      string,
      {
        codigo: string;
        rotulo: string;
        itens: {
          codigoPrincipioAtivo: string;
          nomePrincipioAtivo: string;
          unidadesComRegistro: number;
          href: string;
        }[];
      }
    >
  >((acc, item) => {
    const grupo = acc.get(item.grupoTerapeutico) ?? {
      codigo: item.grupoTerapeutico,
      rotulo:
        ROTULOS_GRUPO_TERAPEUTICO[item.grupoTerapeutico] ??
        item.grupoTerapeutico.replaceAll("_", " "),
      itens: [],
    };
    return new Map(acc).set(item.grupoTerapeutico, {
      ...grupo,
      itens: [
        ...grupo.itens,
        {
          codigoPrincipioAtivo: item.codigoPrincipioAtivo,
          nomePrincipioAtivo: item.nomePrincipioAtivo,
          unidadesComRegistro: item.unidadesComRegistro,
          href: buildFarmaciaHref(portalSlug, { q: item.nomePrincipioAtivo }),
        },
      ],
    });
  }, new Map());
  return [...grupos.values()];
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
  const hasBusca = context.busca.length >= FARMACIA_BUSCA_MINIMO_CARACTERES;
  const hasBuscaCurta = context.busca.length > 0 && !hasBusca;
  const unidadesComMapa = farmacia.unidades.filter((u) =>
    isValidMapCoordinate(u.latitudeUnidade, u.longitudeUnidade),
  );
  const hasMaisUnidades =
    farmacia.unidades.length < farmacia.totalUnidades &&
    context.limiteUnidades < FARMACIA_LIMITE_MAXIMO_UNIDADES;

  return {
    portalSlug,
    portalName,
    status: farmacia.status,
    dataPosicaoMaisRecente: farmacia.dataPosicaoMaisRecente,
    diasDesdePosicaoMaisRecente: farmacia.diasDesdePosicaoMaisRecente,
    dataAtualizacao: farmacia.dataPosicaoMaisRecente ?? farmacia.dataColeta,
    busca: context.busca,
    hasBusca,
    hasBuscaCurta,
    idUnidadeFiltrada: context.idUnidade,
    totalUnidades: farmacia.totalUnidades,
    unidades: farmacia.unidades.map((u) => ({
      ...u,
      href: buildFarmaciaHref(portalSlug, {
        q: context.busca,
        unidade: u.idUnidade,
      }),
    })),
    mapMarkers: unidadesComMapa.map((u) => ({
      id: u.idUnidade,
      latitude: u.latitudeUnidade as number,
      longitude: u.longitudeUnidade as number,
    })),
    hasMaisUnidades,
    totalUnidadesAtivas: sentinelas.totalUnidadesAtivas,
    gruposSentinelas: buildGruposSentinelas(portalSlug, sentinelas),
    maisUnidadesHref: buildFarmaciaHref(portalSlug, {
      q: context.busca,
      unidade: context.idUnidade,
      limite: Math.min(
        context.limiteUnidades + FARMACIA_UNIDADES_POR_PAGINA,
        FARMACIA_LIMITE_MAXIMO_UNIDADES,
      ),
    }),
    limparFiltroUnidadeHref: buildFarmaciaHref(portalSlug, {
      q: context.busca,
    }),
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
