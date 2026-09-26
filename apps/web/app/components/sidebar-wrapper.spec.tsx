import { render, screen } from "@testing-library/react";
import { useQueryState } from "nuqs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNavProvider } from "@/components/mobile-nav-context";
import { SidebarWrapper } from "./sidebar-wrapper";

vi.mock("next/navigation", () => ({
  usePathname: () => "/porciuncula_prefeitura",
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
});
