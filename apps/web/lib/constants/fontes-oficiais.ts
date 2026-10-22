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
  siconfi: {
    nome: "Siconfi",
    url: "https://siconfi.tesouro.gov.br/",
  },
  pncp: {
    nome: "PNCP",
    url: "https://pncp.gov.br",
  },
  notaInformativaIdeb2025: {
    nome: "Nota informativa IDEB 2025",
    url: "https://download.inep.gov.br/ideb/resultados/nota_informativa_ideb_2025.pdf",
  },
} as const satisfies Record<string, FonteOficial>;

const CIPI_VISAO_GERAL_INTERVENCAO_URL =
  "https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao";

/** Link da página de detalhe da obra no CIPI/ObrasGov. */
export function urlObraCipi(idProjeto: string): string {
  return `${CIPI_VISAO_GERAL_INTERVENCAO_URL}/${encodeURIComponent(idProjeto)}`;
}
