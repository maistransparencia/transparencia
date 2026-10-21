import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getFarmaciaSus: vi.fn(),
  getPortalConfig: vi.fn(),
}));

const { getFarmaciaSus, getPortalConfig } = await import("@transparencia/db");
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

  it("lanca erro com portalSlug vazio", async () => {
    await expect(loadFarmaciaData("  ", {})).rejects.toThrow(
      "portalSlug vazio",
    );
  });
});
