export interface FonteOficial {
  nome: string;
  url: string;
}

/** Fontes oficiais citadas na interface. Fonte única para evitar URLs duplicadas. */
export const FONTES_OFICIAIS = {
  ideb: {
    nome: "INEP",
    url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb/resultados",
  },
  obrasgov: {
    nome: "ObrasGov.br",
    url: "https://dd-publico.serpro.gov.br/extensions/painel/ObrasgovbrIntervencao.html",
  },
} as const satisfies Record<string, FonteOficial>;
