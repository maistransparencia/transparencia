import type { RegraPadraoBase } from "./padroes-base";

/**
 * Dívida temporária: páginas e modais ainda não migrados para os padrões base
 * (`DESIGN.md`). Só pode diminuir: cada story de migração remove as suas
 * entradas e baixa `TETO_ISENTOS_TEMPORARIOS`. Zerada pela Story 20.18.
 */
export const isentosTemporarios: Record<RegraPadraoBase, readonly string[]> = {
  "cor-slate-gray-black-white": [],
  "tamanho-de-fonte-em-titulo": [],
  "titulo-h5-h6": [],
  "font-mono-fora-de-tabela-e-numeric": [],
};

/** Teto de entradas de `isentosTemporarios`; zerado pela Story 20.18. */
export const TETO_ISENTOS_TEMPORARIOS = 0;

/**
 * Isenções permanentes e legítimas, cada uma com o motivo: e-mails, imagens
 * OG, cores de série de gráficos e mapa Leaflet.
 */
export const isentosPermanentes: Record<
  RegraPadraoBase,
  Readonly<Record<string, string>>
> = {
  "cor-slate-gray-black-white": {},
  "tamanho-de-fonte-em-titulo": {},
  "titulo-h5-h6": {},
  "font-mono-fora-de-tabela-e-numeric": {},
};
