import { describe, expect, it } from "vitest";
import { getBrasaoDataUrl, resolveBrandDomain } from "./og-assets";

describe("getBrasaoDataUrl", () => {
  it("retorna undefined para asset nulo, indefinido ou vazio", () => {
    expect(getBrasaoDataUrl(null)).toBeUndefined();
    expect(getBrasaoDataUrl(undefined)).toBeUndefined();
    expect(getBrasaoDataUrl("   ")).toBeUndefined();
  });

  it("retorna URLs remotas ou data URLs sem modificação", () => {
    expect(getBrasaoDataUrl("https://example.com/logo.png")).toBe(
      "https://example.com/logo.png",
    );
    expect(getBrasaoDataUrl("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
  });

  it("carrega e converte brasao-porciuncula.png para data URL em base64", () => {
    const dataUrl = getBrasaoDataUrl("brasao-porciuncula.png");
    expect(dataUrl).toBeDefined();
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("suporta nomes com barra inicial (/brasao-natividade.png)", () => {
    const dataUrl = getBrasaoDataUrl("/brasao-natividade.png");
    expect(dataUrl).toBeDefined();
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("bloqueia tentativas de path traversal e retorna undefined", () => {
    expect(getBrasaoDataUrl("../../package.json")).toBeUndefined();
    expect(getBrasaoDataUrl("../../../etc/passwd")).toBeUndefined();
  });

  it("retorna undefined e utiliza cache negativo para arquivos inexistentes", () => {
    expect(getBrasaoDataUrl("brasao-inexistente-123456.png")).toBeUndefined();
    // Segunda chamada deve vir do cache negativo
    expect(getBrasaoDataUrl("brasao-inexistente-123456.png")).toBeUndefined();
  });
});

describe("resolveBrandDomain", () => {
  it("extrai hostname limpo de URLs customizadas", () => {
    expect(resolveBrandDomain("https://custom.gov.br/portal")).toBe(
      "custom.gov.br",
    );
  });

  it("utiliza fallback seguro maistransparencia.com quando não fornecido", () => {
    expect(resolveBrandDomain("")).toBe("maistransparencia.com");
  });
});
