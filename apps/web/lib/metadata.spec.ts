import { describe, expect, it, vi } from "vitest";
import { createPortalMetadata, formatBaseUrl } from "./metadata";

vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn().mockResolvedValue({
    displayName: "Prefeitura de Porciúncula",
    uf: "RJ",
  }),
}));

describe("createPortalMetadata", () => {
  it("formata a baseUrl corretamente com e sem protocolo", () => {
    expect(formatBaseUrl("maistransparencia.com")).toBe(
      "https://maistransparencia.com",
    );
    expect(formatBaseUrl("https://transparencia.gov.br/")).toBe(
      "https://transparencia.gov.br",
    );
    expect(formatBaseUrl(undefined)).toBe("https://maistransparencia.com");
  });

  it("gera metadados com imagens OpenGraph dinâmicas de 1200x630 e Twitter Card para rota raiz", async () => {
    const metadata = await createPortalMetadata(
      "Visão Geral",
      "porciuncula_prefeitura",
      {
        path: "",
        description: "Visão geral das contas",
      },
    );

    expect(metadata.title).toBe("Visão Geral | Prefeitura de Porciúncula");
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "https://maistransparencia.com/porciuncula_prefeitura/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Visão Geral | Prefeitura de Porciúncula",
      },
    ]);
    expect(metadata.twitter?.images).toEqual([
      "https://maistransparencia.com/porciuncula_prefeitura/opengraph-image",
    ]);
  });

  it("gera metadados com imagens OpenGraph para sub-rotas como /despesas", async () => {
    const metadata = await createPortalMetadata(
      "Despesas",
      "porciuncula_prefeitura",
      {
        path: "/despesas",
      },
    );

    expect(metadata.openGraph?.images).toEqual([
      {
        url: "https://maistransparencia.com/porciuncula_prefeitura/despesas/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Despesas | Prefeitura de Porciúncula",
      },
    ]);
    expect(metadata.twitter?.images).toEqual([
      "https://maistransparencia.com/porciuncula_prefeitura/despesas/opengraph-image",
    ]);
  });
});
