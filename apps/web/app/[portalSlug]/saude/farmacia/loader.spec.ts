import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getFarmaciaSentinelas: vi.fn(),
  getFarmaciaSus: vi.fn(),
  getPortalConfig: vi.fn(),
}));

const { getFarmaciaSentinelas, getFarmaciaSus, getPortalConfig } = await import(
  "@transparencia/db"
);
const { parseFarmaciaContext, loadFarmaciaData } = await import("./loader");

describe("parseFarmaciaContext", () => {
  it.each([
    ["abc", 10],
    ["0", 10],
    ["-5", 10],
    ["1.5", 10],
    ["99999", 200],
    ["30", 30],
    ["1e1", 10],
    ["0x10", 10],
  ])("limite %s -> %i", (limite, esperado) => {
    expect(parseFarmaciaContext({ limite }).limiteUnidades).toBe(esperado);
  });

  it("aplica trim e trunca q em 80 caracteres", () => {
    expect(parseFarmaciaContext({ q: "  dipirona  " }).busca).toBe("dipirona");
    expect(parseFarmaciaContext({ q: "a".repeat(200) }).busca).toHaveLength(80);
  });

  it("unidade vazia vira null", () => {
    expect(parseFarmaciaContext({ unidade: "   " }).idUnidade).toBeNull();
    expect(parseFarmaciaContext({}).idUnidade).toBeNull();
  });

  it("usa o primeiro valor quando o parametro se repete", () => {
    const contexto = parseFarmaciaContext({
      q: ["dip", "outro"],
      unidade: ["x", "y"],
      limite: ["20", "30"],
    });
    expect(contexto).toEqual({
      busca: "dip",
      idUnidade: "x",
      limiteUnidades: 20,
    });
  });
});

describe("loadFarmaciaData", () => {
  it("repassa busca, unidade e limite e usa o nome do portal", async () => {
    vi.mocked(getFarmaciaSus).mockResolvedValue({ unidades: [] } as never);
    vi.mocked(getPortalConfig).mockResolvedValue({
      displayName: "Prefeitura X",
    } as never);

    const result = await loadFarmaciaData("portal_x", {
      q: " dip ",
      unidade: "u1",
      limite: "30",
    });

    expect(getFarmaciaSus).toHaveBeenCalledWith("portal_x", {
      busca: "dip",
      idUnidade: "u1",
      limiteUnidades: 30,
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
    const sentinelas = { totalUnidadesAtivas: 2, sentinelas: [] };
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
    vi.mocked(getFarmaciaSus).mockResolvedValue({
      status: "apagao",
      unidades: [],
    } as never);
    const apagao = await loadFarmaciaData("portal_apagao", {});
    expect(getFarmaciaSentinelas).not.toHaveBeenCalled();
    expect(apagao.sentinelas.sentinelas).toEqual([]);
  });

  it("isola a falha das sentinelas sem derrubar a busca", async () => {
    vi.mocked(getFarmaciaSus).mockResolvedValue({
      status: "conforme",
      unidades: [],
    } as never);
    vi.mocked(getPortalConfig).mockResolvedValue(null as never);
    vi.mocked(getFarmaciaSentinelas).mockRejectedValue(new Error("falha"));

    const result = await loadFarmaciaData("portal_conforme", {});

    expect(result.sentinelas).toEqual({
      totalUnidadesAtivas: 0,
      sentinelas: [],
    });
    expect(result.farmacia.status).toBe("conforme");
  });

  it("lanca erro com portalSlug vazio", async () => {
    await expect(loadFarmaciaData("  ", {})).rejects.toThrow(
      "portalSlug vazio",
    );
  });
});
