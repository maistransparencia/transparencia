import { fireEvent, render, screen } from "@testing-library/react";
import { useQueryState } from "nuqs";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNavProvider } from "@/components/mobile-nav-context";
import { SidebarWrapper } from "./sidebar-wrapper";

const mockPush = vi.fn();
let currentPathname = "/porciuncula_prefeitura";
let currentSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("nuqs", () => ({
  parseAsString: {
    withDefault: () => ({
      withOptions: () => ({}),
    }),
    withOptions: () => ({}),
  },
  useQueryState: vi.fn(),
}));

const mockUseQueryState = vi.mocked(useQueryState);

describe("SidebarWrapper Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = "/porciuncula_prefeitura";
    currentSearchParams = new URLSearchParams("");
  });

  it("deve repassar radarAlertCount correspondente ao ano selecionado a partir de radarAlertsCountByYear", () => {
    mockUseQueryState.mockImplementation(((key: string) => {
      if (key === "ano") return ["2024", vi.fn()];
      return [null, vi.fn()];
    }) as unknown as typeof useQueryState);

    const { rerender } = render(
      <MobileNavProvider>
        <SidebarWrapper
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
          radarAlertsCountByYear={{ 2024: 7, 2026: 0 }}
        />
      </MobileNavProvider>,
    );

    expect(
      screen.getByLabelText("7 alertas críticos apurados"),
    ).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();

    // Troca para 2026 (onde contagem é 0)
    mockUseQueryState.mockImplementation(((key: string) => {
      if (key === "ano") return ["2026", vi.fn()];
      return [null, vi.fn()];
    }) as unknown as typeof useQueryState);

    rerender(
      <MobileNavProvider>
        <SidebarWrapper
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
          radarAlertsCountByYear={{ 2024: 7, 2026: 0 }}
        />
      </MobileNavProvider>,
    );

    expect(
      screen.queryByLabelText(/alertas críticos apurados/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("deve utilizar radarAlertCount diretamente quando radarAlertsCountByYear não for informado", () => {
    mockUseQueryState.mockImplementation(((key: string) => {
      if (key === "ano") return ["2024", vi.fn()];
      return [null, vi.fn()];
    }) as unknown as typeof useQueryState);

    render(
      <MobileNavProvider>
        <SidebarWrapper
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
          radarAlertCount={2}
        />
      </MobileNavProvider>,
    );

    expect(
      screen.getByLabelText("2 alertas críticos apurados"),
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("deve navegar para novo portal preservando sub-rota e query ano (sem entidades) e registrar evento no posthog", () => {
    currentPathname = "/porciuncula_prefeitura/receitas";
    currentSearchParams = new URLSearchParams("ano=2024&entidades=1,2");

    const mockPortais = [
      {
        portalSlug: "porciuncula_prefeitura",
        displayName: "Porciúncula",
        uf: "RJ",
      },
      {
        portalSlug: "natividade_prefeitura",
        displayName: "Natividade",
        uf: "RJ",
      },
      {
        portalSlug: "bom_jesus_itabapoana_prefeitura",
        displayName: "Bom Jesus do Itabapoana",
        uf: "RJ",
      },
      {
        portalSlug: "sao_fidelis_prefeitura",
        displayName: "São Fidélis",
        uf: "RJ",
      },
    ];

    render(
      <MobileNavProvider>
        <SidebarWrapper
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
          portais={mockPortais}
        />
      </MobileNavProvider>,
    );

    const selectElements = screen.getAllByLabelText(/selecionar município/i);
    expect(selectElements.length).toBeGreaterThan(0);

    fireEvent.change(selectElements[0], {
      target: { value: "natividade_prefeitura" },
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/natividade_prefeitura/receitas?ano=2024",
    );
    expect(window.localStorage.getItem("preferred_portal")).toBe(
      "natividade_prefeitura",
    );
    expect(posthog.capture).toHaveBeenCalledWith("portal_changed", {
      from_portal: "porciuncula_prefeitura",
      to_portal: "natividade_prefeitura",
    });
  });

  it("deve permitir alternar de volta de um município secundário para Porciúncula", () => {
    mockPush.mockClear();
    currentPathname = "/natividade_prefeitura/licitacoes";
    currentSearchParams = new URLSearchParams("ano=2025");

    const mockPortais = [
      {
        portalSlug: "porciuncula_prefeitura",
        displayName: "Porciúncula",
        uf: "RJ",
      },
      {
        portalSlug: "natividade_prefeitura",
        displayName: "Natividade",
        uf: "RJ",
      },
    ];

    render(
      <MobileNavProvider>
        <SidebarWrapper
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
          portais={mockPortais}
        />
      </MobileNavProvider>,
    );

    const selectElements = screen.getAllByLabelText(/selecionar município/i);
    fireEvent.change(selectElements[0], {
      target: { value: "porciuncula_prefeitura" },
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/porciuncula_prefeitura/licitacoes?ano=2025",
    );
    expect(posthog.capture).toHaveBeenCalledWith("portal_changed", {
      from_portal: "natividade_prefeitura",
      to_portal: "porciuncula_prefeitura",
    });
  });

  it("deve navegar para a raiz do portal ao alternar estando em página estática /termos", () => {
    mockPush.mockClear();
    currentPathname = "/termos";
    currentSearchParams = new URLSearchParams("");

    const mockPortais = [
      {
        portalSlug: "porciuncula_prefeitura",
        displayName: "Porciúncula",
        uf: "RJ",
      },
      {
        portalSlug: "natividade_prefeitura",
        displayName: "Natividade",
        uf: "RJ",
      },
    ];

    render(
      <MobileNavProvider>
        <SidebarWrapper
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
          portais={mockPortais}
        />
      </MobileNavProvider>,
    );

    const selectElements = screen.getAllByLabelText(/selecionar município/i);
    fireEvent.change(selectElements[0], {
      target: { value: "natividade_prefeitura" },
    });

    expect(mockPush).toHaveBeenCalledWith("/natividade_prefeitura");
  });

  it("não deve navegar se o portal selecionado for o mesmo atual", () => {
    mockPush.mockClear();
    currentPathname = "/porciuncula_prefeitura";

    render(
      <MobileNavProvider>
        <SidebarWrapper
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
          portais={[
            {
              portalSlug: "porciuncula_prefeitura",
              displayName: "Porciúncula",
              uf: "RJ",
            },
            {
              portalSlug: "natividade_prefeitura",
              displayName: "Natividade",
              uf: "RJ",
            },
          ]}
        />
      </MobileNavProvider>,
    );

    const selectElements = screen.getAllByLabelText(/selecionar município/i);
    fireEvent.change(selectElements[0], {
      target: { value: "porciuncula_prefeitura" },
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("não deve renderizar a sidebar quando estiver na página raiz ('/')", () => {
    currentPathname = "/";

    const { container } = render(
      <MobileNavProvider>
        <SidebarWrapper
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
        />
      </MobileNavProvider>,
    );

    expect(container.firstChild).toBeNull();
  });
});
