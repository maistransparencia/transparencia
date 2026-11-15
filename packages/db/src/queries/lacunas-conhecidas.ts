import { db } from "../client";

export type TipoLacuna = "lacuna" | "divergencia";

export interface LacunaConhecidaDTO {
  codigo: string;
  /** Fonte do catálogo a que a lacuna se refere, ou `todas_as_fontes`. */
  fonte: string;
  tipo: TipoLacuna;
  textoCidadao: string;
}

interface LacunaConhecidaLinha {
  codigo: string;
  fonte: string;
  tipo: TipoLacuna;
  texto_cidadao: string;
}

/**
 * Lacunas e divergências conhecidas do portal vigentes na data de referência
 * (AAAA-MM-DD). Vigência sem fim continua valendo.
 */
export async function getLacunasConhecidas(
  portalSlug: string,
  dataReferencia: string,
): Promise<LacunaConhecidaDTO[]> {
  if (typeof portalSlug !== "string" || portalSlug.trim() === "") return [];
  if (Number.isNaN(Date.parse(dataReferencia))) {
    throw new Error(`dataReferencia inválida: ${dataReferencia}`);
  }

  const linhas = (await db
    .selectFrom("fct_lacunas_conhecidas")
    .select(["codigo", "fonte", "tipo", "texto_cidadao"])
    .where("portal_slug", "=", portalSlug)
    .where("vigencia_inicio", "<=", dataReferencia)
    .where((eb) =>
      eb.or([
        eb("vigencia_fim", "is", null),
        eb("vigencia_fim", ">=", dataReferencia),
      ]),
    )
    .orderBy("tipo")
    .orderBy("codigo")
    .execute()) as LacunaConhecidaLinha[];

  return linhas.map((linha) => ({
    codigo: linha.codigo,
    fonte: linha.fonte,
    tipo: linha.tipo,
    textoCidadao: linha.texto_cidadao,
  }));
}
