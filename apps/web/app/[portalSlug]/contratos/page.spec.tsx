import { permanentRedirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContratosPage from "./page";

vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

describe("ContratosPage redirect route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve redirecionar com parâmetro 'numero' codificado para a visualização de contratos em licitações", async () => {
    await expect(
      ContratosPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({ numero: "001/2024" }),
      }),
    ).rejects.toThrow(
      "NEXT_REDIRECT: /porciuncula_prefeitura/licitacoes?contratoNumero=001%2F2024#contratos-servicos-vigentes",
    );

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/porciuncula_prefeitura/licitacoes?contratoNumero=001%2F2024#contratos-servicos-vigentes",
    );
  });

  it("deve suportar parâmetro alternativo 'contratoNumero'", async () => {
    await expect(
      ContratosPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({ contratoNumero: "CTR-42" }),
      }),
    ).rejects.toThrow(
      "NEXT_REDIRECT: /porciuncula_prefeitura/licitacoes?contratoNumero=CTR-42#contratos-servicos-vigentes",
    );

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/porciuncula_prefeitura/licitacoes?contratoNumero=CTR-42#contratos-servicos-vigentes",
    );
  });

  it("deve redirecionar para a âncora padrão quando nenhum número de contrato for informado", async () => {
    await expect(
      ContratosPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow(
      "NEXT_REDIRECT: /porciuncula_prefeitura/licitacoes#contratos-servicos-vigentes",
    );

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/porciuncula_prefeitura/licitacoes#contratos-servicos-vigentes",
    );
  });

  it("deve isolar estritamente o tenant informado nos parâmetros da rota", async () => {
    await expect(
      ContratosPage({
        params: Promise.resolve({ portalSlug: "outro_municipio" }),
        searchParams: Promise.resolve({ numero: "999/2024" }),
      }),
    ).rejects.toThrow(
      "NEXT_REDIRECT: /outro_municipio/licitacoes?contratoNumero=999%2F2024#contratos-servicos-vigentes",
    );

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/outro_municipio/licitacoes?contratoNumero=999%2F2024#contratos-servicos-vigentes",
    );
  });

  it("deve tratar parâmetros como array extraindo o primeiro elemento sem lançar TypeError", async () => {
    await expect(
      ContratosPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({
          numero: ["123/2024", "456/2024"],
          ano: ["2024", "2025"],
        }),
      }),
    ).rejects.toThrow(
      "NEXT_REDIRECT: /porciuncula_prefeitura/licitacoes?contratoNumero=123%2F2024&ano=2024#contratos-servicos-vigentes",
    );

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/porciuncula_prefeitura/licitacoes?contratoNumero=123%2F2024&ano=2024#contratos-servicos-vigentes",
    );
  });

  it("deve repassar o parâmetro ano mesmo sem número de contrato", async () => {
    await expect(
      ContratosPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({ ano: "2025" }),
      }),
    ).rejects.toThrow(
      "NEXT_REDIRECT: /porciuncula_prefeitura/licitacoes?ano=2025#contratos-servicos-vigentes",
    );

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/porciuncula_prefeitura/licitacoes?ano=2025#contratos-servicos-vigentes",
    );
  });
});
