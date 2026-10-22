export interface Legislacao {
  nome: string;
  url: string;
}

const PLANALTO = "https://www.planalto.gov.br/ccivil_03";

/** Leis e normas citadas na interface. Fonte única para evitar URLs duplicadas. */
export const LEGISLACAO = {
  lrf: {
    nome: "Lei de Responsabilidade Fiscal (LC 101/2000)",
    url: `${PLANALTO}/leis/lcp/lcp101.htm`,
  },
  lcp131: {
    nome: "Lei da Transparência (LC 131/2009)",
    url: `${PLANALTO}/leis/lcp/lcp131.htm`,
  },
  lei4320: {
    nome: "Lei 4.320/1964",
    url: `${PLANALTO}/leis/l4320.htm`,
  },
  lei14133: {
    nome: "Lei 14.133/2021 (Nova Lei de Licitações)",
    url: `${PLANALTO}/_ato2019-2022/2021/lei/l14133.htm`,
  },
  lei14133Ato20212024: {
    nome: "Lei 14.133/2021 (Nova Lei de Licitações)",
    url: `${PLANALTO}/_ato2021-2024/2021/lei/l14133.htm`,
  },
  lai: {
    nome: "Lei de Acesso à Informação (Lei 12.527/2011)",
    url: `${PLANALTO}/_ato2011-2014/2011/lei/l12527.htm`,
  },
  lgpd: {
    nome: "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
    url: `${PLANALTO}/_ato2015-2018/2018/lei/l13709.htm`,
  },
  constituicao: {
    nome: "Constituição Federal de 1988",
    url: `${PLANALTO}/constituicao/constituicao.htm`,
  },
  lei9717: {
    nome: "Lei 9.717/1998",
    url: `${PLANALTO}/leis/l9717.htm`,
  },
  lei14113: {
    nome: "Lei 14.113/2020",
    url: `${PLANALTO}/_ato2019-2022/2020/lei/l14113.htm`,
  },
  lei9766: {
    nome: "Lei 9.766/1998",
    url: `${PLANALTO}/leis/l9766.htm`,
  },
  lei11947: {
    nome: "Lei 11.947/2009",
    url: `${PLANALTO}/_ato2007-2010/2009/lei/l11947.htm`,
  },
  lei10880: {
    nome: "Lei 10.880/2004",
    url: `${PLANALTO}/_ato2004-2006/2004/lei/l10.880.htm`,
  },
  lei14654: {
    nome: "Lei 14.654/2023",
    url: `${PLANALTO}/_ato2023-2026/2023/lei/l14654.htm`,
  },
  lei8080: {
    nome: "Lei Orgânica da Saúde (Lei 8.080/1990)",
    url: `${PLANALTO}/leis/l8080.htm`,
  },
} as const satisfies Record<string, Legislacao>;

export type ChaveLegislacao = keyof typeof LEGISLACAO;

/** Devolve a URL da norma, com âncora do artigo quando informada. */
export function urlLegislacao(chave: ChaveLegislacao, ancora?: string): string {
  const { url } = LEGISLACAO[chave];
  return ancora ? `${url}#${ancora}` : url;
}
