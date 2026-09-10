import type { CategoriaRegime } from "@transparencia/db";

export type { CategoriaRegime };

export const CATEGORIAS_REGIME: readonly CategoriaRegime[] = [
  "efetivo_concurso",
  "efetivo_comissao",
  "comissionado",
  "contrato_temporario",
  "agente_politico",
  "rpps_inativos",
  "outros",
] as const;

export const CATEGORIA_REGIME_LABELS: Record<CategoriaRegime, string> = {
  efetivo_concurso: "Concursados (Efetivos)",
  efetivo_comissao: "Efetivos em Chefia (FG/CC)",
  comissionado: "Cargos em Comissão",
  contrato_temporario: "Contratos Temporários",
  agente_politico: "Agentes Políticos",
  rpps_inativos: "RPPS / Previdenciários",
  outros: "Outros",
};
