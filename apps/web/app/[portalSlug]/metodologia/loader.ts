import {
  getLacunasConhecidas,
  type LacunaConhecidaDTO,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";
import { utcReferenceDate } from "@/lib/frescor-fontes";
import {
  type ComoAtualizamosRawData,
  loadComoAtualizamosData,
} from "../como-atualizamos/loader";

export interface MetodologiaRawData extends ComoAtualizamosRawData {
  lacunas: LacunaConhecidaDTO[];
}

async function fetchRawMetodologiaData(
  portalSlug: string,
): Promise<MetodologiaRawData> {
  const [fontes, lacunas] = await Promise.all([
    loadComoAtualizamosData(portalSlug),
    getLacunasConhecidas(portalSlug.trim(), utcReferenceDate()),
  ]);
  return { ...fontes, lacunas };
}

const UMA_HORA_EM_SEGUNDOS = 3600;

export const loadMetodologiaData = createCachedDataLoader(
  fetchRawMetodologiaData,
  "metodologia",
  UMA_HORA_EM_SEGUNDOS,
);
