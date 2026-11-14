import {
  buildSourceRows,
  type FonteComoAtualizamosViewModel,
  warningForStatus,
} from "@/lib/frescor-fontes";
import type { ComoAtualizamosRawData } from "./loader";

export interface FonteComoAtualizamosLinha
  extends FonteComoAtualizamosViewModel {
  /** Texto da situação sem depender de cor; vazio quando a coleta está no prazo. */
  aviso: string | null;
  situacaoTexto: string;
  /** Quem publica o dado; nulo quando o catálogo não conhece a fonte. */
  fonteOficial: { nome: string; url: string | null } | null;
  etiqueta: { variante: "success" | "accent" | "default"; texto: string };
}

/** Nacional usa o link do catálogo; municipal e estadual usam o órgão do portal. */
function resolveOfficialSource(
  fonte: FonteComoAtualizamosViewModel,
  raw: ComoAtualizamosRawData,
): FonteComoAtualizamosLinha["fonteOficial"] {
  if (fonte.esferaFonte === "municipal") {
    return raw.portalNome ? { nome: raw.portalNome, url: raw.portalUrl } : null;
  }
  if (fonte.esferaFonte === "estadual") {
    return raw.fonteEmendasEstaduais ?? null;
  }
  return fonte.nomeFonte
    ? { nome: fonte.nomeFonte, url: fonte.urlFonte }
    : null;
}

const ETIQUETA_POR_SITUACAO: Record<
  FonteComoAtualizamosViewModel["situacao"],
  FonteComoAtualizamosLinha["etiqueta"]
> = {
  coleta_em_dia: { variante: "success", texto: "Buscada no prazo" },
  coleta_atrasada: { variante: "accent", texto: "Sem verificação no prazo" },
  coleta_sem_registro: { variante: "default", texto: "Sem registro de busca" },
  nao_monitorado: { variante: "default", texto: "Data não acompanhada" },
};

export function buildComoAtualizamosViewModel(raw: ComoAtualizamosRawData) {
  const fontes: FonteComoAtualizamosLinha[] = buildSourceRows(
    raw.frescorFontes,
  ).map((fonte) => {
    const aviso = warningForStatus(fonte.situacao, fonte.dataVerificacao);
    return {
      ...fonte,
      aviso,
      situacaoTexto:
        fonte.situacao === "coleta_em_dia"
          ? "Dados buscados dentro do prazo previsto"
          : (aviso ?? ""),
      fonteOficial: resolveOfficialSource(fonte, raw),
      etiqueta: ETIQUETA_POR_SITUACAO[fonte.situacao],
    };
  });
  const atrasadas = fontes.filter(
    (fonte) => fonte.situacao === "coleta_atrasada",
  );
  const algumaMonitorada = fontes.some(
    (fonte) => fonte.situacao !== "nao_monitorado",
  );

  return {
    portalSlug: raw.portalSlug,
    fontes,
    acompanhadas: fontes.filter((fonte) => fonte.situacao !== "nao_monitorado"),
    semAcompanhamento: fontes.filter(
      (fonte) => fonte.situacao === "nao_monitorado",
    ),
    avisoTopo:
      atrasadas.length > 0
        ? `Não conseguimos verificar ${atrasadas.length === 1 ? "uma fonte" : `${atrasadas.length} fontes`} no prazo previsto. Os números dela podem não ser os mais novos.`
        : null,
    semFonteMonitorada: !algumaMonitorada,
  };
}
