import { fireEvent, render, screen } from "@testing-library/react";
import type { PortalConfig } from "@transparencia/db";
import { getAllPortais } from "@transparencia/db";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MunicipalLandingClient } from "./municipal-landing-client";
import RootPage from "./page";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRedirect = vi.fn();
const mockCookiesGet = vi.fn();
const mockLocationReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(""),
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: mockCookiesGet,
  }),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("@transparencia/db", () => ({
  getAllPortais: vi.fn(),
}));

const mockPortais: PortalConfig[] = [
  {
    portalSlug: "porciuncula_prefeitura",
    displayName: "Prefeitura de Porciúncula",
    uf: "RJ",
    portalUrl: "https://transparencia.porciuncula.rj.gov.br",
    baseHost: "https://transparencia.porciuncula.rj.gov.br",
    cidadeClean: "PORCIUNCULA",
    anoInicial: 2021,
    empresaPadrao: "7",
    brasaoAsset: "brasao-porciuncula.svg",
    dataExtracao: "2026-03-01",
    dataExtracaoDate: null,
    previdencia: {
      habilitado: true,
      sigla: "CAPREM",
      nome: "Caixa de Aposentadoria e Pensões dos Servidores Públicos de Porciúncula",
      cnpj: "01180031000134",
    },
    highlights: [],
  },
  {
    portalSlug: "natividade_prefeitura",
    displayName: "Prefeitura de Natividade",
    uf: "RJ",
    portalUrl: "https://transparencia.natividade.rj.gov.br",
    baseHost: "https://transparencia.natividade.rj.gov.br",
    cidadeClean: "NATIVIDADE",
    anoInicial: 2021,
    empresaPadrao: "6",
    brasaoAsset: "brasao-natividade.svg",
    dataExtracao: "2026-03-01",
    dataExtracaoDate: null,
    previdencia: {
      habilitado: true,
      sigla: "NATPREVI",
      nome: "Instituto de Previdência dos Servidores Públicos do Município de Natividade",
      cnpj: "01709035000167",
    },
    highlights: [],
  },
];

describe("RootPage (Landing Page Cívica Dinâmica e Redirecionamento)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    // biome-ignore lint/suspicious/noDocumentCookie: teste unitario
    document.cookie = "";
    mockCookiesGet.mockReturnValue(undefined);
    vi.mocked(getAllPortais).mockResolvedValue(mockPortais);
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        replace: mockLocationReplace,
      },
    });
  });

  it("deve carregar os portais dinamicamente do banco e renderizar a landing page para novo visitante", async () => {
    const pageElement = await RootPage({});
    render(pageElement);

    // Header com marca
    expect(screen.getByText("MaisTransparencia")).toBeInTheDocument();
    expect(
      screen.getByText("MONITORAMENTO CÍVICO INDEPENDENTE"),
    ).toBeInTheDocument();

    // Título principal
    expect(
      screen.getByRole("heading", { name: /selecione o município/i, level: 1 }),
    ).toBeInTheDocument();

    // Cards
    expect(screen.getByText("Porciúncula")).toBeInTheDocument();
    expect(screen.getByText("Natividade")).toBeInTheDocument();
    expect(
      screen.getByAltText("Brasão oficial de Porciúncula"),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText("Brasão oficial de Natividade"),
    ).toBeInTheDocument();

    // Tags nos cards
    expect(screen.getAllByText("Orçamento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Compras").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contratos").length).toBeGreaterThan(0);
    expect(screen.getByText("Previdência (CAPREM)")).toBeInTheDocument();
    expect(screen.getByText("Previdência (NATPREVI)")).toBeInTheDocument();

    // Com menos de 5 cidades, NÃO deve exibir o campo de busca
    expect(
      screen.queryByPlaceholderText("Buscar município"),
    ).not.toBeInTheDocument();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockLocationReplace).not.toHaveBeenCalled();
  });

  it("deve exibir o campo de busca apenas quando houver 5 ou mais cidades", () => {
    const cincoCidades: PortalConfig[] = [
      ...mockPortais,
      {
        portalSlug: "cidade_3",
        displayName: "Prefeitura de Cidade 3",
        uf: "RJ",
        portalUrl: "https://cidade3.gov.br",
        baseHost: "https://cidade3.gov.br",
        cidadeClean: "CIDADE3",
        anoInicial: 2021,
        empresaPadrao: "1",
        brasaoAsset: "brasao-3.svg",
        dataExtracao: "2026-03-01",
        dataExtracaoDate: null,
        previdencia: { habilitado: false, sigla: "", nome: "" },
        highlights: [],
      },
      {
        portalSlug: "cidade_4",
        displayName: "Prefeitura de Cidade 4",
        uf: "RJ",
        portalUrl: "https://cidade4.gov.br",
        baseHost: "https://cidade4.gov.br",
        cidadeClean: "CIDADE4",
        anoInicial: 2021,
        empresaPadrao: "1",
        brasaoAsset: "brasao-4.svg",
        dataExtracao: "2026-03-01",
        dataExtracaoDate: null,
        previdencia: { habilitado: false, sigla: "", nome: "" },
        highlights: [],
      },
      {
        portalSlug: "cidade_5",
        displayName: "Prefeitura de Cidade 5",
        uf: "RJ",
        portalUrl: "https://cidade5.gov.br",
        baseHost: "https://cidade5.gov.br",
        cidadeClean: "CIDADE5",
        anoInicial: 2021,
        empresaPadrao: "1",
        brasaoAsset: "brasao-5.svg",
        dataExtracao: "2026-03-01",
        dataExtracaoDate: null,
        previdencia: { habilitado: false, sigla: "", nome: "" },
        highlights: [],
      },
    ];

    render(<MunicipalLandingClient portais={cincoCidades} />);

    // Campo de busca DEVE estar presente
    const searchInput = screen.getByPlaceholderText("Buscar município");
    expect(searchInput).toBeInTheDocument();
    expect(screen.getByText("5 de 5")).toBeInTheDocument();

    // Filtra pelo nome de Natividade
    fireEvent.change(searchInput, { target: { value: "Natividade" } });
    expect(screen.getByText("Natividade")).toBeInTheDocument();
    expect(screen.queryByText("Porciúncula")).not.toBeInTheDocument();
    expect(screen.getByText("1 de 5")).toBeInTheDocument();
  });

  it("deve redirecionar no servidor quando cookie preferred_portal estiver definido", async () => {
    mockCookiesGet.mockReturnValue({ value: "natividade_prefeitura" });

    await expect(RootPage({})).rejects.toThrow(
      "NEXT_REDIRECT: /natividade_prefeitura",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/natividade_prefeitura");
  });

  it("não deve redirecionar no servidor se o cookie preferred_portal for desconhecido", async () => {
    mockCookiesGet.mockReturnValue({ value: "municipio_inexistente" });

    const pageElement = await RootPage({});
    render(pageElement);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText("Porciúncula")).toBeInTheDocument();
  });

  it("não deve redirecionar se o usuário passar ?select=true para escolher outro município", async () => {
    mockCookiesGet.mockReturnValue({ value: "porciuncula_prefeitura" });

    const pageElement = await RootPage({
      searchParams: Promise.resolve({ select: "true" }),
    });
    render(pageElement);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText("Porciúncula")).toBeInTheDocument();
  });

  it("deve acionar redirecionamento seguro e salvar cookie quando usuário tem preferred_portal no localStorage", () => {
    window.localStorage.setItem("preferred_portal", "natividade_prefeitura");

    render(<MunicipalLandingClient portais={mockPortais} />);

    expect(mockLocationReplace).toHaveBeenCalledWith("/natividade_prefeitura");
    expect(document.cookie).toContain("preferred_portal=natividade_prefeitura");
    expect(
      screen.getByText(/redirecionando para o seu município de preferência/i),
    ).toBeInTheDocument();
  });

  it("deve redirecionar para porciuncula quando usuário legado tem last_seen_extraction", () => {
    window.localStorage.setItem("last_seen_extraction", "2026-03-01");

    render(<MunicipalLandingClient portais={mockPortais} />);

    expect(mockLocationReplace).toHaveBeenCalledWith("/porciuncula_prefeitura");
    expect(document.cookie).toContain(
      "preferred_portal=porciuncula_prefeitura",
    );
    expect(window.localStorage.getItem("preferred_portal")).toBe(
      "porciuncula_prefeitura",
    );
  });

  it("deve salvar preferência em cookie e localStorage ao clicar no card de Natividade", async () => {
    const pageElement = await RootPage({});
    render(pageElement);

    const natividadeButton = screen.getByRole("button", {
      name: /natividade/i,
    });
    fireEvent.click(natividadeButton);

    expect(window.localStorage.getItem("preferred_portal")).toBe(
      "natividade_prefeitura",
    );
    expect(document.cookie).toContain("preferred_portal=natividade_prefeitura");
    expect(mockPush).toHaveBeenCalledWith("/natividade_prefeitura");
    expect(posthog.capture).toHaveBeenCalledWith("portal_selected_landing", {
      portal_slug: "natividade_prefeitura",
    });
  });

  it("deve renderizar dinamicamente qualquer município adicionado ao banco de dados", () => {
    const portaisComNovoMunicipio: PortalConfig[] = [
      ...mockPortais,
      {
        portalSlug: "bom_jesus_itabapoana_prefeitura",
        displayName: "Prefeitura de Bom Jesus do Itabapoana",
        uf: "RJ",
        portalUrl: "https://transparencia.bomjesus.rj.gov.br",
        baseHost: "https://transparencia.bomjesus.rj.gov.br",
        cidadeClean: "BOM_JESUS_DO_ITABAPOANA",
        anoInicial: 2021,
        empresaPadrao: "1",
        brasaoAsset: "brasao-bom-jesus.svg",
        dataExtracao: "2026-03-01",
        dataExtracaoDate: null,
        previdencia: {
          habilitado: true,
          sigla: "FUNPREV",
          nome: "Fundo de Previdência dos Servidores de Bom Jesus",
          cnpj: "03456789000123",
        },
        highlights: [],
      },
    ];

    render(<MunicipalLandingClient portais={portaisComNovoMunicipio} />);

    expect(screen.getByText("Bom Jesus do Itabapoana")).toBeInTheDocument();
    expect(
      screen.getByAltText("Brasão oficial de Bom Jesus do Itabapoana"),
    ).toBeInTheDocument();
    expect(screen.getByText("Previdência (FUNPREV)")).toBeInTheDocument();
  });
});
