import {
  type FarmaciaSentinelasDTO,
  getFarmaciaSentinelas,
  getResumoFarmaciaSus,
  type ResumoFarmaciaSusDTO,
  type StatusConformidadeFarmacia,
} from "./farmacia";

export interface SaudeFarmaciaResumoDTO {
  status: StatusConformidadeFarmacia;
  /** Data (AAAA-MM-DD) da lista de estoque mais recente. */
  dataPosicaoMaisRecente: string | null;
  /** Unidades que informaram estoque; nulo fora do estado "conforme". */
  totalUnidadesAtivas: number | null;
  /** Remédios essenciais que aparecem na lista de estoque; nulo fora do estado "conforme". */
  essenciaisNoEstoque: number | null;
  totalEssenciais: number | null;
}

/**
 * Números da Farmácia SUS para o topo de /saude. Só existem com a farmácia em
 * conformidade: indisponível ou em apagão não afirma nada sobre o estoque.
 */
export function montarSaudeFarmaciaResumo(
  resumo: Pick<ResumoFarmaciaSusDTO, "status" | "dataPosicaoMaisRecente">,
  sentinelas: Pick<
    FarmaciaSentinelasDTO,
    "totalUnidadesAtivas" | "indicadores"
  >,
): SaudeFarmaciaResumoDTO {
  const conforme =
    resumo.status === "conforme" && sentinelas.totalUnidadesAtivas > 0;
  const comEssenciais = conforme && sentinelas.indicadores.totalEssenciais > 0;
  return {
    status: resumo.status,
    dataPosicaoMaisRecente: resumo.dataPosicaoMaisRecente,
    totalUnidadesAtivas: conforme ? sentinelas.totalUnidadesAtivas : null,
    essenciaisNoEstoque: comEssenciais
      ? sentinelas.indicadores.essenciaisNoEstoque
      : null,
    totalEssenciais: comEssenciais
      ? sentinelas.indicadores.totalEssenciais
      : null,
  };
}

export async function getSaudeFarmaciaResumo(
  portalSlug: string,
): Promise<SaudeFarmaciaResumoDTO> {
  const resumo = await getResumoFarmaciaSus(portalSlug);
  // Sentinelas só fazem sentido com estoque vigente (estado conforme).
  const sentinelas =
    resumo.status === "conforme"
      ? await getFarmaciaSentinelas(portalSlug)
      : { totalUnidadesAtivas: 0, indicadores: indicadoresVazios };
  return montarSaudeFarmaciaResumo(resumo, sentinelas);
}

const indicadoresVazios: FarmaciaSentinelasDTO["indicadores"] = {
  totalEssenciais: 0,
  essenciaisNoEstoque: 0,
  essenciaisSomenteLoteVencido: 0,
  essenciaisSomenteCombinacao: 0,
  essenciaisSemRegistro: 0,
};
