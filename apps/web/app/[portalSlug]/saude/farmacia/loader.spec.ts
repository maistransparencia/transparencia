import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getFarmaciaSus: vi.fn(),
  getPortalConfig: vi.fn(),
}));

const { parseFarmaciaContext } = await import("./loader");

describe("parseFarmaciaContext", () => {
  it.each([
    ["abc", 10],
    ["0", 10],
    ["-5", 10],
    ["1.5", 10],
    ["99999", 200],
    ["30", 30],
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
