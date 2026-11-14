import type { FrescorFonteDTO } from "@transparencia/db";
import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({ getFrescorFontes: vi.fn() }));

const { getFrescorFontes } = await import("@transparencia/db");
const {
  warningForStatus,
  loadSourceFreshness,
  loadSourceFreshnessOrEmpty,
  frequencyInPlainLanguage,
  buildSourceRows,
  buildSourceSeal,
  formatPublishedPeriod,
} = await import("./frescor-fontes");

const linha = (parcial: Partial<FrescorFonteDTO> = {}): FrescorFonteDTO => ({
  fonte: "portal_municipal",
  descricaoDados: "sistema contábil da Prefeitura",
  nomeFonte: "Fonte Exemplo",
  urlFonte: "https://fonte.exemplo.gov.br",
  esferaFonte: "nacional",
  frequenciaEsperada: "diaria",
  ultimaColetaEm: "2026-11-12T08:00:00.000Z",
  situacao: "coleta_em_dia",
  periodoMaisRecente: null,
  granularidadePeriodo: null,
  situacaoDado: "periodo_nao_disponivel",
  ...parcial,
});

describe("buildSourceSeal", () => {
  it("em dia: selo com data pt-BR, link e sem aviso", () => {
    expect(buildSourceSeal([linha()], "portal_municipal", "portal_x")).toEqual({
      descricao: "sistema contábil da Prefeitura",
      dataVerificacao: "12/11/2026",
      dadosAte: null,
      aviso: null,
      href: "/portal_x/como-atualizamos",
    });
  });

  it("atrasada: aviso com a data da última coleta", () => {
    const selo = buildSourceSeal(
      [linha({ situacao: "coleta_atrasada" })],
      "portal_municipal",
      "portal_x",
    );
    expect(selo?.aviso).toBe(
      "Não conseguimos verificar esta fonte desde 12/11/2026.",
    );
  });

  it("não monitorada: selo sem data e aviso de não acompanhamento", () => {
    const selo = buildSourceSeal(
      [linha({ situacao: "nao_monitorado", ultimaColetaEm: null })],
      "portal_municipal",
      "portal_x",
    );
    expect(selo?.dataVerificacao).toBeNull();
    expect(selo?.aviso).toBe(
      "Não acompanhamos a data de atualização desta fonte.",
    );
  });

  it("fonte ausente no DTO: sem selo", () => {
    expect(buildSourceSeal([], "portal_municipal", "portal_x")).toBeNull();
  });
});

describe("período publicado", () => {
  it("escreve o período no tamanho que a fonte publica", () => {
    expect(formatPublishedPeriod("2026-04-30", "mes")).toBe("abril de 2026");
    expect(formatPublishedPeriod("2026-08-31", "quadrimestre")).toBe(
      "2º quadrimestre de 2026",
    );
    expect(formatPublishedPeriod("2026-06-30", "semestre")).toBe(
      "1º semestre de 2026",
    );
    expect(formatPublishedPeriod("2026-11-10", "dia")).toBe("10/11/2026");
    expect(formatPublishedPeriod(null, null)).toBeNull();
  });

  it("selo mostra até quando vão os dados, sem aviso quando recente", () => {
    const selo = buildSourceSeal(
      [
        linha({
          periodoMaisRecente: "2026-09-30",
          granularidadePeriodo: "mes",
          situacaoDado: "dado_recente",
        }),
      ],
      "portal_municipal",
      "portal_x",
    );
    expect(selo).toMatchObject({ dadosAte: "setembro de 2026", aviso: null });
  });

  it("defasado: aviso diz que é estimativa", () => {
    const selo = buildSourceSeal(
      [
        linha({
          periodoMaisRecente: "2026-04-30",
          granularidadePeriodo: "mes",
          situacaoDado: "dado_defasado",
        }),
      ],
      "portal_municipal",
      "portal_x",
    );
    expect(selo?.aviso).toContain("vão até abril de 2026");
    expect(selo?.aviso).toContain("estimativa");
  });

  it("aviso de coleta atrasada tem prioridade e não é duplicado", () => {
    const selo = buildSourceSeal(
      [
        linha({
          situacao: "coleta_atrasada",
          periodoMaisRecente: "2026-04-30",
          granularidadePeriodo: "mes",
          situacaoDado: "dado_defasado",
        }),
      ],
      "portal_municipal",
      "portal_x",
    );
    expect(selo?.aviso).toMatch(/Não conseguimos verificar/);
  });

  it("sem período: nada de 'dados até' nem aviso presumido", () => {
    const [linhaPagina] = buildSourceRows([linha()]);
    expect(linhaPagina).toMatchObject({ dadosAte: null, avisoDado: null });
  });
});

describe("loadSourceFreshness", () => {
  it("falha da query sobe o erro, para o cache não guardar lista vazia", async () => {
    vi.mocked(getFrescorFontes).mockRejectedValueOnce(new Error("banco"));
    await expect(loadSourceFreshness("portal_x")).rejects.toThrow("banco");
  });

  it("passa a data UTC atual como referência", async () => {
    vi.mocked(getFrescorFontes).mockResolvedValueOnce([linha()]);
    await loadSourceFreshness("portal_x");
    expect(getFrescorFontes).toHaveBeenLastCalledWith(
      "portal_x",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });
});

describe("frequência e aviso", () => {
  it.each([
    ["diaria", "todo dia útil"],
    ["semanal", "toda semana"],
    ["mensal", "todo mês"],
    ["anual", "uma vez por ano"],
    ["sob_demanda", "quando há dado novo"],
  ])("%s vira %s", (codigo, texto) => {
    expect(frequencyInPlainLanguage(codigo)).toBe(texto);
  });

  it("sem registro de coleta: aviso próprio, sem data", () => {
    const selo = buildSourceSeal(
      [linha({ situacao: "coleta_sem_registro", ultimaColetaEm: null })],
      "portal_municipal",
      "portal_x",
    );
    expect(selo?.dataVerificacao).toBeNull();
    expect(selo?.aviso).toBe(
      "Ainda não temos registro de quando buscamos os dados desta fonte.",
    );
  });

  it("em dia não tem aviso", () => {
    expect(warningForStatus("coleta_em_dia", "12/11/2026")).toBeNull();
  });

  it("lista da página traz frequência e data formatadas", () => {
    expect(buildSourceRows([linha()])[0]).toMatchObject({
      frequencia: "todo dia útil",
      dataVerificacao: "12/11/2026",
    });
  });
});

describe("loadSourceFreshnessOrEmpty", () => {
  it("falha da query devolve lista vazia", async () => {
    vi.mocked(getFrescorFontes).mockRejectedValueOnce(new Error("banco"));
    await expect(loadSourceFreshnessOrEmpty("portal_x")).resolves.toEqual([]);
  });
});
