import type { ResultadoMinimoLegal } from "./educacao-siope-metrics";
import type { StatusConformidadeFarmacia } from "./farmacia";
import type { ResumoObrasDTO } from "./obras";
import type { ResultadoSaudeMinimo } from "./saude-minimo-constitucional";

export const ESTADOS_SITUACAO_AREA = [
  "normal",
  "parcial",
  "abaixo",
  "sem_dado",
  "indisponivel",
] as const;

export type EstadoSituacaoArea = (typeof ESTADOS_SITUACAO_AREA)[number];

/** Únicos fatos com régua que dão "Merece atenção" na home; a UI traduz o código em frase. */
export type MotivoAtencaoArea = "abaixo_minimo" | "obra_paralisada";

export interface SituacaoAreaDTO {
  estado: EstadoSituacaoArea;
  emAtencao: boolean;
  motivo: MotivoAtencaoArea | null;
}

export interface SituacaoHomeDTO {
  saude: SituacaoAreaDTO;
  obras: SituacaoAreaDTO;
  educacao: SituacaoAreaDTO;
}

interface MinimoResultadoEntrada {
  resultado: ResultadoSaudeMinimo | ResultadoMinimoLegal;
}

export interface CalcularSituacaoHomeParams {
  /** Exercício já encerrado: o veredito `abaixo` do mínimo só vale para ano fechado. */
  anoFechado: boolean;
  /** `null` quando a fonte falhou ou não existe para o município. */
  minimoSaude: MinimoResultadoEntrada | null;
  /** Contexto da farmácia; o apagão (não divulgar estoque) nunca gera atenção. */
  farmaciaStatus?: StatusConformidadeFarmacia;
  resumoObras: Pick<ResumoObrasDTO, "totalObras" | "paralisadas"> | null;
  minimoEducacao: MinimoResultadoEntrada | null;
  /** Contexto do Ideb; a queda da nota (oscila a cada dois anos) nunca gera atenção. */
  crescimentoPontosIdeb?: number | null;
}

const SEM_ATENCAO = { emAtencao: false, motivo: null } as const;

const ESTADO_POR_RESULTADO: Record<
  ResultadoSaudeMinimo | ResultadoMinimoLegal,
  EstadoSituacaoArea
> = {
  cumpriu: "normal",
  abaixo: "abaixo",
  parcial: "parcial",
  indeterminado: "sem_dado",
  sem_dado: "sem_dado",
};

const situacaoDoMinimo = (
  minimo: MinimoResultadoEntrada | null,
  anoFechado: boolean,
): SituacaoAreaDTO => {
  if (!minimo) return { estado: "indisponivel", ...SEM_ATENCAO };
  const estado = ESTADO_POR_RESULTADO[minimo.resultado];
  if (estado === "abaixo" && anoFechado) {
    return { estado, emAtencao: true, motivo: "abaixo_minimo" };
  }
  return { estado, ...SEM_ATENCAO };
};

const situacaoDasObras = (
  resumo: CalcularSituacaoHomeParams["resumoObras"],
): SituacaoAreaDTO => {
  if (!resumo) return { estado: "indisponivel", ...SEM_ATENCAO };
  if (resumo.totalObras === 0) return { estado: "sem_dado", ...SEM_ATENCAO };
  if (resumo.paralisadas > 0) {
    return { estado: "normal", emAtencao: true, motivo: "obra_paralisada" };
  }
  return { estado: "normal", ...SEM_ATENCAO };
};

/**
 * Estado e etiqueta "Merece atenção" de cada área da home. Dois gatilhos, ambos fatos
 * com régua: mínimo `abaixo` em ano fechado e obra paralisada. `parcial`, `sem_dado`,
 * apagão da farmácia e queda do Ideb não disparam; a tela só traduz os códigos.
 */
export function calcularSituacaoHome({
  anoFechado,
  minimoSaude,
  resumoObras,
  minimoEducacao,
}: CalcularSituacaoHomeParams): SituacaoHomeDTO {
  return {
    saude: situacaoDoMinimo(minimoSaude, anoFechado),
    obras: situacaoDasObras(resumoObras),
    educacao: situacaoDoMinimo(minimoEducacao, anoFechado),
  };
}
