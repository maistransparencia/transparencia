import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShowYourWorkButton } from "./show-your-work-button";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

describe("ShowYourWorkButton Component", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("deve renderizar o botão de 3 pontos com acessibilidade adequada", () => {
    render(
      <ShowYourWorkButton
        portalSlug="porciuncula_prefeitura"
        ano={2025}
        tipo="gasto_sensivel"
        categoria="combustivel_frota"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /opções de auditoria/i,
    });
    expect(trigger).toBeDefined();
  });

  it("deve abrir e fechar o dropdown de auditoria ao clicar", async () => {
    render(
      <ShowYourWorkButton
        portalSlug="porciuncula_prefeitura"
        ano={2025}
        tipo="gasto_sensivel"
        categoria="combustivel_frota"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /opções de auditoria/i,
    });

    // Dropdown inicialmente fechado
    expect(screen.queryByText(/Baixar registros \(CSV\)/i)).toBeNull();

    // Abre o dropdown
    fireEvent.click(trigger);
    expect(screen.getByText(/Baixar registros \(CSV\)/i)).toBeDefined();

    // Pressionar Escape fecha o dropdown
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText(/Baixar registros \(CSV\)/i)).toBeNull();
  });

  it("deve disparar download com os parâmetros corretos ao clicar na opção CSV", async () => {
    const mockBlob = new Blob(["test-csv-data"], { type: "text/csv" });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "Content-Disposition":
          'attachment; filename="despesas_combustivel.csv"',
      }),
      blob: async () => mockBlob,
    });
    global.fetch = mockFetch;

    // Mock URL.createObjectURL e revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();

    render(
      <ShowYourWorkButton
        portalSlug="porciuncula_prefeitura"
        ano={2025}
        tipo="gasto_sensivel"
        categoria="combustivel_frota"
        entidades="1,2"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /opções de auditoria/i,
    });
    fireEvent.click(trigger);

    const downloadButton = screen.getByRole("menuitem", {
      name: /baixar registros/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/porciuncula_prefeitura/export?tipo=gasto_sensivel&ano=2025&categoria=combustivel_frota&entidades=1%2C2",
        ),
      );
    });

    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

    expect(posthog.capture).toHaveBeenCalledWith(
      "show_your_work_download_clicked",
      {
        portal_slug: "porciuncula_prefeitura",
        tipo: "gasto_sensivel",
        ano: 2025,
        categoria: "combustivel_frota",
        funcao_codigo: null,
        entidades: "1,2",
      },
    );

    expect(posthog.capture).toHaveBeenCalledWith(
      "show_your_work_download_completed",
      expect.objectContaining({
        portal_slug: "porciuncula_prefeitura",
        tipo: "gasto_sensivel",
        ano: 2025,
        filename: "despesas_combustivel.csv",
      }),
    );
  });

  it("deve exibir mensagem de erro se a API retornar erro de limite de requisição (HTTP 429) e enviar telemetria", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error:
          "Muitos downloads requisitados. Por favor, aguarde alguns minutos.",
      }),
    });
    global.fetch = mockFetch;

    render(
      <ShowYourWorkButton
        portalSlug="porciuncula_prefeitura"
        ano={2025}
        tipo="opacidade_99"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /opções de auditoria/i,
    });
    fireEvent.click(trigger);

    const downloadButton = screen.getByRole("menuitem", {
      name: /baixar registros/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText(/muitos downloads requisitados/i)).toBeDefined();
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      "show_your_work_download_clicked",
      {
        portal_slug: "porciuncula_prefeitura",
        tipo: "opacidade_99",
        ano: 2025,
        categoria: null,
        funcao_codigo: null,
        entidades: null,
      },
    );

    expect(posthog.capture).toHaveBeenCalledWith(
      "show_your_work_download_failed",
      expect.objectContaining({
        portal_slug: "porciuncula_prefeitura",
        tipo: "opacidade_99",
        ano: 2025,
        status: 429,
        error:
          "Muitos downloads requisitados. Por favor, aguarde alguns minutos.",
      }),
    );
  });
});
