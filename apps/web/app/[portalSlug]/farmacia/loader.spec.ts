import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getFarmaciaIndiceAlfabetico: vi.fn(),
  getFarmaciaLotesAVencer: vi.fn(),
  getFarmaciaSentinelas: vi.fn(),
  getFarmaciaSus: vi.fn(),
  getPortalConfig: vi.fn(),
}));

const {
  getFarmaciaIndiceAlfabetico,
  getFarmaciaLotesAVencer,
  getFarmaciaSentinelas,
  getFarmaciaSus,
  getPortalConfig,
} = await import("@transparencia/db");
const { parseFarmaciaContext, loadFarmaciaData } = await import("./loader");

describe("parseFarmaciaContext", () => {
  it("aplica trim e trunca q em 80 caracteres", () => {
    expect(parseFarmaciaContext({ q: "  dipirona  " }).busca).toBe("dipirona");
    expect(parseFarmaciaContext({ q: "a".repeat(200) }).busca).toHaveLength(80);
  });

  it("usa o primeiro valor quando o parametro se repete e ignora os demais", () => {
    expect(
      parseFarmaciaContext({ q: ["dip", "outro"], unidade: "x" } as never),
    ).toMatchObject({ busca: "dip" });
  });

  it("aceita so uma letra A-Z e normaliza a caixa", () => {
    expect(parseFarmaciaContext({ letra: " a " }).letra).toBe("A");
    expect(parseFarmaciaContext({ letra: "0-9" }).letra).toBe("0-9");
    expect(parseFarmaciaContext({ letra: "ab" }).letra).toBe("");
    expect(parseFarmaciaContext({ letra: "1" }).letra).toBe("");
    expect(parseFarmaciaContext({}).letra).toBe("");
  });

  it("usa os passos padrao e limita letras e itens revelados", () => {
    expect(parseFarmaciaContext({})).toMatchObject({
      letrasVisiveis: 6,
      itensVisiveis: 25,
    });
    expect(parseFarmaciaContext({ letras: "12", itens: "50" })).toMatchObject({
      letrasVisiveis: 12,
      itensVisiveis: 50,
    });
    expect(
      parseFarmaciaContext({ letras: "999", itens: "999999" }),
    ).toMatchObject({ letrasVisiveis: 26, itensVisiveis: 1000 });
    expect(parseFarmaciaContext({ letras: "-3", itens: "abc" })).toMatchObject({
      letrasVisiveis: 6,
      itensVisiveis: 25,
    });
  });
});

describe("loadFarmaciaData", () => {
  beforeEach(() => {
    vi.mocked(getFarmaciaIndiceAlfabetico).mockReset();
    vi.mocked(getFarmaciaIndiceAlfabetico).mockResolvedValue(null as never);
    vi.mocked(getFarmaciaLotesAVencer).mockResolvedValue(null as never);
  });

  it("repassa a busca com o limite maximo de unidades e usa o nome do portal", async () => {
    vi.mocked(getFarmaciaSus).mockResolvedValue({ unidades: [] } as never);
    vi.mocked(getPortalConfig).mockResolvedValue({
      displayName: "Prefeitura X",
    } as never);

    const result = await loadFarmaciaData("portal_x", { q: " dip " });

    expect(getFarmaciaSus).toHaveBeenCalledWith("portal_x", {
      busca: "dip",
      limiteUnidades: 200,
    });
    expect(getPortalConfig).toHaveBeenCalledWith("portal_x");
    expect(result.portalName).toBe("Prefeitura X");
  });

  it("portalName vazio quando nao ha configuracao", async () => {
    vi.mocked(getFarmaciaSus).mockResolvedValue({ unidades: [] } as never);
    vi.mocked(getPortalConfig).mockResolvedValue(null as never);
    const result = await loadFarmaciaData("portal_x", {});
    expect(result.portalName).toBe("");
  });

  it("carrega sentinelas somente no estado conforme", async () => {
    const sentinelas = {
      totalUnidadesAtivas: 2,
      indicadores: {
        totalEssenciais: 0,
        essenciaisNoEstoque: 0,
        essenciaisSomenteCombinacao: 0,
        essenciaisSemRegistro: 0,
      },
      sentinelas: [],
    };
    vi.mocked(getFarmaciaSentinelas).mockResolvedValue(sentinelas);
    vi.mocked(getPortalConfig).mockResolvedValue(null as never);

    vi.mocked(getFarmaciaSus).mockResolvedValue({
      status: "conforme",
      unidades: [],
    } as never);
    const conforme = await loadFarmaciaData("portal_conforme", {});
    expect(getFarmaciaSentinelas).toHaveBeenCalledWith("portal_conforme");
    expect(conforme.sentinelas).toEqual(sentinelas);

    vi.mocked(getFarmaciaSentinelas).mockClear();
    vi.mocked(getFarmaciaLotesAVencer).mockClear();
    vi.mocked(getFarmaciaSus).mockResolvedValue({
      status: "apagao",
      unidades: [],
    } as never);
    const apagao = await loadFarmaciaData("portal_apagao", {});
    expect(getFarmaciaSentinelas).not.toHaveBeenCalled();
    expect(apagao.sentinelas.sentinelas).toEqual([]);
    expect(getFarmaciaLotesAVencer).not.toHaveBeenCalled();
    expect(apagao.lotesAVencer).toBeNull();
  });

  it("isola a falha das sentinelas sem derrubar a busca", async () => {
    vi.mocked(getFarmaciaSus).mockResolvedValue({
      status: "conforme",
      unidades: [],
    } as never);
    vi.mocked(getPortalConfig).mockResolvedValue(null as never);
    vi.mocked(getFarmaciaSentinelas).mockRejectedValue(new Error("falha"));

    const result = await loadFarmaciaData("portal_conforme", {});

    expect(result.sentinelas.totalUnidadesAtivas).toBe(0);
    expect(result.sentinelas.sentinelas).toEqual([]);
    expect(result.farmacia.status).toBe("conforme");
  });

  it("repassa os lotes a vencer e isola a falha da query", async () => {
    const lotes = {
      janelaDias: 60,
      totalLotesComValidade: 3,
      totalLotesAVencer: 1,
      totalRemediosAVencer: 1,
      totalLotesVencidosComSaldo: 0,
      dataVencimentoMaisProxima: "2026-11-01",
    };
    vi.mocked(getFarmaciaSus).mockResolvedValue({
      status: "conforme",
      unidades: [],
    } as never);
    vi.mocked(getPortalConfig).mockResolvedValue(null as never);
    vi.mocked(getFarmaciaSentinelas).mockResolvedValue({
      totalUnidadesAtivas: 0,
      indicadores: {},
      sentinelas: [],
    } as never);

    vi.mocked(getFarmaciaLotesAVencer).mockResolvedValue(lotes);
    expect(
      (await loadFarmaciaData("portal_lotes_ok", {})).lotesAVencer,
    ).toEqual(lotes);

    vi.mocked(getFarmaciaLotesAVencer).mockRejectedValue(new Error("falha"));
    const falha = await loadFarmaciaData("portal_lotes_falha", {});
    expect(falha.lotesAVencer).toBeNull();
    expect(falha.farmacia.status).toBe("conforme");
  });

  it("lanca erro com portalSlug vazio", async () => {
    await expect(loadFarmaciaData("  ", {})).rejects.toThrow(
      "portalSlug vazio",
    );
  });

  it("pede o resumo do indice sem letra e todos os itens da letra escolhida", async () => {
    vi.mocked(getFarmaciaSus).mockResolvedValue({ unidades: [] } as never);
    vi.mocked(getPortalConfig).mockResolvedValue(null as never);

    await loadFarmaciaData("portal_x", { letras: "12" });
    expect(getFarmaciaIndiceAlfabetico).toHaveBeenLastCalledWith("portal_x", {
      letra: "",
      limiteLetras: 12,
      limiteMedicamentosPorLetra: 3,
    });

    await loadFarmaciaData("portal_x", { letra: "a", itens: "50" });
    expect(getFarmaciaIndiceAlfabetico).toHaveBeenLastCalledWith("portal_x", {
      letra: "A",
      limiteLetras: 6,
      limiteMedicamentosPorLetra: 50,
    });
  });

  it("com busca por texto o indice serve so de navegacao", async () => {
    vi.mocked(getFarmaciaSus).mockResolvedValue({ unidades: [] } as never);
    vi.mocked(getPortalConfig).mockResolvedValue(null as never);

    await loadFarmaciaData("portal_x", { q: "dipirona", letra: "A" });
    expect(getFarmaciaIndiceAlfabetico).toHaveBeenLastCalledWith("portal_x", {
      letra: undefined,
      limiteLetras: 1,
      limiteMedicamentosPorLetra: 1,
    });
  });

  it("isola a falha do indice sem derrubar a busca", async () => {
    vi.mocked(getFarmaciaSus).mockResolvedValue({ unidades: [] } as never);
    vi.mocked(getPortalConfig).mockResolvedValue(null as never);
    vi.mocked(getFarmaciaIndiceAlfabetico).mockRejectedValue(
      new Error("falha"),
    );

    const result = await loadFarmaciaData("portal_x", {});
    expect(result.indice).toBeNull();
  });
});
