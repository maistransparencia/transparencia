import {
  getFarmaciaIndiceAlfabetico,
  getFarmaciaLotesAVencer,
  getFarmaciaSentinelas,
  getFarmaciaSus,
  getPortalConfig,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";
import { getPostHogServer } from "@/posthog-server";
import {
  FARMACIA_BUSCA_MINIMO_CARACTERES,
  FARMACIA_INDICE_MAXIMO_ITENS,
  FARMACIA_INDICE_MAXIMO_LETRAS,
  FARMACIA_INDICE_PASSO_ITENS,
  FARMACIA_INDICE_PASSO_LETRAS,
} from "./view-model";

export interface FarmaciaSearchParams {
  q?: string | string[];
  letra?: string | string[];
  letras?: string | string[];
  itens?: string | string[];
}

const FARMACIA_BUSCA_MAXIMO_CARACTERES = 80;
const FARMACIA_INDICE_ITENS_POR_LETRA = 3;
/** A busca traz todas as unidades com o remédio: o mapa e as duas visões dependem do conjunto completo. */
export const FARMACIA_LIMITE_UNIDADES_BUSCA = 200;

/** Letra A–Z ou o grupo "0-9" dos nomes que não começam com letra. */
const LETRA_VALIDA = /^(?:[A-Z]|0-9)$/;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export interface FarmaciaContext {
  busca: string;
  /** Letra do índice A–Z ("" quando o índice está no resumo). */
  letra: string;
  letrasVisiveis: number;
  itensVisiveis: number;
}

function parseQuantidade(
  value: string | string[] | undefined,
  padrao: number,
  maximo: number,
): number {
  const numero = Number.parseInt(firstValue(value), 10);
  return Number.isFinite(numero) && numero > 0
    ? Math.min(numero, maximo)
    : padrao;
}

export function parseFarmaciaContext(
  searchParams: FarmaciaSearchParams,
): FarmaciaContext {
  return {
    busca: firstValue(searchParams.q)
      .trim()
      .slice(0, FARMACIA_BUSCA_MAXIMO_CARACTERES),
    letra: (() => {
      const letra = firstValue(searchParams.letra).trim().toUpperCase();
      return LETRA_VALIDA.test(letra) ? letra : "";
    })(),
    letrasVisiveis: parseQuantidade(
      searchParams.letras,
      FARMACIA_INDICE_PASSO_LETRAS,
      FARMACIA_INDICE_MAXIMO_LETRAS,
    ),
    itensVisiveis: parseQuantidade(
      searchParams.itens,
      FARMACIA_INDICE_PASSO_ITENS,
      FARMACIA_INDICE_MAXIMO_ITENS,
    ),
  };
}

async function fetchRawFarmaciaData(
  portalSlug: string,
  searchParams: FarmaciaSearchParams,
) {
  const tenantSlug = portalSlug.trim();
  if (!tenantSlug) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  const context = parseFarmaciaContext(searchParams);

  // Com busca por texto o índice só serve de navegação: não carrega listas.
  const buscaAtiva = context.busca.length >= FARMACIA_BUSCA_MINIMO_CARACTERES;
  const [farmacia, portalConfig, indice] = await Promise.all([
    getFarmaciaSus(tenantSlug, {
      busca: context.busca,
      limiteUnidades: FARMACIA_LIMITE_UNIDADES_BUSCA,
    }),
    getPortalConfig(tenantSlug),
    // O índice é opcional: falha dele não derruba a busca.
    getFarmaciaIndiceAlfabetico(tenantSlug, {
      letra: buscaAtiva ? undefined : context.letra,
      limiteLetras: buscaAtiva ? 1 : context.letrasVisiveis,
      limiteMedicamentosPorLetra: buscaAtiva
        ? 1
        : context.letra
          ? context.itensVisiveis
          : FARMACIA_INDICE_ITENS_POR_LETRA,
    }).catch((erro: unknown) => {
      getPostHogServer()?.captureException(erro as Error, undefined, {
        route: "farmacia:indice-az",
      });
      return null;
    }),
  ]);

  // Sentinelas só fazem sentido quando há estoque vigente (estado conforme).
  // O bloco é opcional: falha dele não derruba a busca.
  const sentinelasVazias = {
    totalUnidadesAtivas: 0,
    indicadores: {
      totalEssenciais: 0,
      essenciaisNoEstoque: 0,
      essenciaisSomenteCombinacao: 0,
      essenciaisSemRegistro: 0,
    },
    sentinelas: [],
  };
  const sentinelas =
    farmacia.status === "conforme"
      ? await getFarmaciaSentinelas(tenantSlug).catch(() => sentinelasVazias)
      : sentinelasVazias;

  // Lotes a vencer dependem de validade informada; falha da query só omite o card.
  const lotesAVencer =
    farmacia.status === "conforme"
      ? await getFarmaciaLotesAVencer(tenantSlug).catch(() => null)
      : null;

  return {
    portalSlug: tenantSlug,
    portalName: portalConfig?.displayName ?? "",
    context,
    farmacia,
    indice,
    sentinelas,
    lotesAVencer,
  };
}

export const loadFarmaciaData = createCachedDataLoader(
  fetchRawFarmaciaData,
  "farmacia-sus",
  3600,
);
