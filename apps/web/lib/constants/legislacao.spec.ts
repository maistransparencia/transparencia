import { describe, expect, it } from "vitest";
import { FONTES_OFICIAIS, urlObraCipi } from "./fontes-oficiais";
import { type ChaveLegislacao, urlLegislacao } from "./legislacao";

const PLANALTO = "https://www.planalto.gov.br/ccivil_03";

describe("urlLegislacao", () => {
  const casos: Array<[ChaveLegislacao, string | undefined, string]> = [
    ["lrf", undefined, `${PLANALTO}/leis/lcp/lcp101.htm`],
    ["lrf", "art48a", `${PLANALTO}/leis/lcp/lcp101.htm#art48a`],
    ["lcp131", undefined, `${PLANALTO}/leis/lcp/lcp131.htm`],
    ["lei4320", undefined, `${PLANALTO}/leis/l4320.htm`],
    ["lei14133", "art5", `${PLANALTO}/_ato2019-2022/2021/lei/l14133.htm#art5`],
    [
      "lei14133Ato20212024",
      "art92",
      `${PLANALTO}/_ato2021-2024/2021/lei/l14133.htm#art92`,
    ],
    ["lai", undefined, `${PLANALTO}/_ato2011-2014/2011/lei/l12527.htm`],
    ["lgpd", undefined, `${PLANALTO}/_ato2015-2018/2018/lei/l13709.htm`],
    [
      "constituicao",
      "art167",
      `${PLANALTO}/constituicao/constituicao.htm#art167`,
    ],
    ["lei9717", "art1", `${PLANALTO}/leis/l9717.htm#art1`],
    ["lei14113", undefined, `${PLANALTO}/_ato2019-2022/2020/lei/l14113.htm`],
    ["lei9766", undefined, `${PLANALTO}/leis/l9766.htm`],
    ["lei11947", undefined, `${PLANALTO}/_ato2007-2010/2009/lei/l11947.htm`],
    ["lei10880", undefined, `${PLANALTO}/_ato2004-2006/2004/lei/l10.880.htm`],
    ["lei14654", undefined, `${PLANALTO}/_ato2023-2026/2023/lei/l14654.htm`],
    ["lei8080", undefined, `${PLANALTO}/leis/l8080.htm`],
  ];

  it.each(casos)("%s (%s) -> %s", (chave, ancora, esperado) => {
    expect(urlLegislacao(chave, ancora)).toBe(esperado);
  });
});

describe("fontes oficiais", () => {
  it("mantem as urls externas esperadas", () => {
    expect(FONTES_OFICIAIS.siconfi.url).toBe("https://siconfi.tesouro.gov.br/");
    expect(FONTES_OFICIAIS.pncp.url).toBe("https://pncp.gov.br");
  });

  it("urlObraCipi codifica o id do projeto", () => {
    expect(urlObraCipi("123/45 a")).toBe(
      "https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao/123%2F45%20a",
    );
  });
});
