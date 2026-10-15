import { render, screen, waitFor } from "@testing-library/react";
import L from "leaflet";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObrasMapaInterativo } from "./obras-mapa-interativo";

const clickListeners: Array<() => void> = [];

const mockMarker = {
  bindPopup: vi.fn().mockReturnThis(),
  on: vi.fn((event: string, cb: () => void) => {
    if (event === "click") {
      clickListeners.push(cb);
    }
    return mockMarker;
  }),
  addTo: vi.fn().mockReturnThis(),
  getLatLng: vi.fn().mockReturnValue({ lat: -20.9634, lng: -42.0408 }),
  openPopup: vi.fn(),
};

const mockMap = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  remove: vi.fn(),
  invalidateSize: vi.fn(),
  getSize: vi.fn(),
  getZoom: vi.fn().mockReturnValue(13),
  getMinZoom: vi.fn().mockReturnValue(1),
  getMaxZoom: vi.fn().mockReturnValue(18),
  mouseEventToContainerPoint: vi.fn().mockReturnValue({ x: 100, y: 100 }),
  setZoomAround: vi.fn(),
};

const mockLayerGroup = {
  addTo: vi.fn().mockReturnThis(),
  clearLayers: vi.fn(),
};

vi.mock("leaflet", () => ({
  default: {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    layerGroup: vi.fn(() => mockLayerGroup),
    divIcon: vi.fn(() => ({})),
    marker: vi.fn(() => mockMarker),
  },
}));

describe("ObrasMapaInterativo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clickListeners.length = 0;
    mockMap.getSize.mockReturnValue({ x: 800, y: 580 });
  });

  it("renderiza o container do mapa com sucesso", () => {
    render(<ObrasMapaInterativo markers={[]} center={[-20.9634, -42.0408]} />);

    const container = screen.getByTestId("obras-mapa-container");
    expect(container).toBeInTheDocument();
    expect(
      screen.getByText(
        /nenhuma obra com localização cadastrada|nenhuma obra georreferenciada/i,
      ),
    ).toBeInTheDocument();
  });

  it("inicializa o mapa Leaflet e adiciona marcadores para obras georreferenciadas", async () => {
    const mockMarkers = [
      {
        idProjeto: "OBR-10",
        nomeObra: "Reforma da Praça Central",
        situacao: "em_execucao" as const,
        situacaoLabel: "Em Execução",
        situacaoColorHex: "#059669",
        latitude: -20.9634,
        longitude: -42.0408,
        isUrbana: true,
        valorInvestimentoFormatado: "R$ 500.000",
        percentualExecucaoFormatado: "60%",
        orgaoResponsavel: "Sec Obras",
        dataFimPrevistaFormatada: "31/12/2026",
      },
    ];

    render(
      <ObrasMapaInterativo
        markers={mockMarkers}
        center={[-20.9634, -42.0408]}
      />,
    );

    await waitFor(() => {
      expect(L.map).toHaveBeenCalled();
      expect(L.marker).toHaveBeenCalledWith(
        [-20.9634, -42.0408],
        expect.anything(),
      );
    });

    expect(
      screen.queryByText(/nenhuma obra georreferenciada/i),
    ).not.toBeInTheDocument();
  });

  it("aciona voo e popup ao alterar selectedObraId", async () => {
    const mockMarkers = [
      {
        idProjeto: "OBR-10",
        nomeObra: "Reforma da Praça Central",
        situacao: "em_execucao" as const,
        situacaoLabel: "Em Execução",
        situacaoColorHex: "#059669",
        latitude: -20.9634,
        longitude: -42.0408,
        isUrbana: true,
        valorInvestimentoFormatado: "R$ 500.000",
        percentualExecucaoFormatado: "60%",
        orgaoResponsavel: "Sec Obras",
        dataFimPrevistaFormatada: "31/12/2026",
      },
    ];

    const { rerender } = render(
      <ObrasMapaInterativo
        markers={mockMarkers}
        center={[-20.9634, -42.0408]}
        selectedObraId={null}
      />,
    );

    await waitFor(() => {
      expect(mockMarker.addTo).toHaveBeenCalled();
    });

    rerender(
      <ObrasMapaInterativo
        markers={mockMarkers}
        center={[-20.9634, -42.0408]}
        selectedObraId="OBR-10"
      />,
    );

    await waitFor(() => {
      expect(mockMap.flyTo).toHaveBeenCalled();
      expect(mockMarker.openPopup).toHaveBeenCalled();
    });
  });

  it("usa setView sem animação ao selecionar obra com o mapa oculto (tamanho zero)", async () => {
    mockMap.getSize.mockReturnValue({ x: 0, y: 0 });
    const mockMarkers = [
      {
        idProjeto: "OBR-10",
        nomeObra: "Reforma da Praça Central",
        situacao: "em_execucao" as const,
        situacaoLabel: "Em Execução",
        situacaoColorHex: "#059669",
        latitude: -20.9634,
        longitude: -42.0408,
        isUrbana: true,
        valorInvestimentoFormatado: "R$ 500.000",
        percentualExecucaoFormatado: "60%",
        orgaoResponsavel: "Sec Obras",
        dataFimPrevistaFormatada: "31/12/2026",
      },
    ];

    const { rerender } = render(
      <ObrasMapaInterativo
        markers={mockMarkers}
        center={[-20.9634, -42.0408]}
        selectedObraId={null}
      />,
    );

    await waitFor(() => {
      expect(mockMarker.addTo).toHaveBeenCalled();
    });

    rerender(
      <ObrasMapaInterativo
        markers={mockMarkers}
        center={[-20.9634, -42.0408]}
        selectedObraId="OBR-10"
      />,
    );

    await waitFor(() => {
      expect(mockMap.setView).toHaveBeenCalledWith(
        { lat: -20.9634, lng: -42.0408 },
        16,
        { animate: false },
      );
    });
    expect(mockMap.flyTo).not.toHaveBeenCalled();
  });

  it("recentraliza na obra selecionada quando o mapa volta a ficar visível", async () => {
    let resizeCallback: ResizeObserverCallback | null = null;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    const triggerResize = (width: number, height: number) =>
      resizeCallback?.(
        [{ contentRect: { width, height } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );

    const mockMarkers = [
      {
        idProjeto: "OBR-10",
        nomeObra: "Reforma da Praça Central",
        situacao: "em_execucao" as const,
        situacaoLabel: "Em Execução",
        situacaoColorHex: "#059669",
        latitude: -20.9634,
        longitude: -42.0408,
        isUrbana: true,
        valorInvestimentoFormatado: "R$ 500.000",
        percentualExecucaoFormatado: "60%",
        orgaoResponsavel: "Sec Obras",
        dataFimPrevistaFormatada: "31/12/2026",
      },
    ];

    render(
      <ObrasMapaInterativo
        markers={mockMarkers}
        center={[-20.9634, -42.0408]}
        selectedObraId="OBR-10"
      />,
    );

    await waitFor(() => {
      expect(mockMarker.addTo).toHaveBeenCalled();
    });

    triggerResize(0, 0);
    mockMap.invalidateSize.mockClear();
    mockMap.setView.mockClear();
    triggerResize(360, 380);

    expect(mockMap.invalidateSize).toHaveBeenCalled();
    expect(mockMap.setView).toHaveBeenCalledWith(
      { lat: -20.9634, lng: -42.0408 },
      16,
      { animate: false },
    );

    vi.unstubAllGlobals();
  });

  it("dispara onSelectObra com o idProjeto correto ao clicar no marcador", async () => {
    const onSelectObra = vi.fn();
    const mockMarkers = [
      {
        idProjeto: "OBR-10",
        nomeObra: "Reforma da Praça Central",
        situacao: "em_execucao" as const,
        situacaoLabel: "Em Execução",
        situacaoColorHex: "#059669",
        latitude: -20.9634,
        longitude: -42.0408,
        isUrbana: true,
        valorInvestimentoFormatado: "R$ 500.000",
        percentualExecucaoFormatado: "60%",
        orgaoResponsavel: "Sec Obras",
        dataFimPrevistaFormatada: "31/12/2026",
      },
    ];

    render(
      <ObrasMapaInterativo
        markers={mockMarkers}
        center={[-20.9634, -42.0408]}
        onSelectObra={onSelectObra}
      />,
    );

    await waitFor(() => {
      expect(clickListeners.length).toBeGreaterThan(0);
    });

    clickListeners[0]();

    expect(onSelectObra).toHaveBeenCalledWith("OBR-10");
  });

  it("exibe aviso de zoom e não altera o mapa quando o usuário rola sem tecla modificadora (Cmd/Ctrl)", async () => {
    render(<ObrasMapaInterativo markers={[]} center={[-20.9634, -42.0408]} />);

    await waitFor(() => {
      expect(L.map).toHaveBeenCalled();
    });

    const container = screen.getByTestId("obras-mapa-container");
    const mapInner = container.firstElementChild as HTMLElement;

    // Simula scroll sem tecla modificadora
    const wheelEventWithoutModifier = new WheelEvent("wheel", {
      deltaY: 100,
      metaKey: false,
      ctrlKey: false,
      bubbles: true,
      cancelable: true,
    });

    mapInner.dispatchEvent(wheelEventWithoutModifier);

    // O aviso deve ser exibido
    await waitFor(() => {
      expect(screen.getByTestId("obras-mapa-zoom-hint")).toBeInTheDocument();
      expect(
        screen.getByText(/scroll para aplicar zoom no mapa/i),
      ).toBeInTheDocument();
    });

    // O zoom do mapa não deve ter sido acionado
    expect(mockMap.setZoomAround).not.toHaveBeenCalled();
  });

  it("permite zoom e oculta aviso quando a tecla modificadora (Cmd ou Ctrl) está pressionada", async () => {
    render(<ObrasMapaInterativo markers={[]} center={[-20.9634, -42.0408]} />);

    await waitFor(() => {
      expect(L.map).toHaveBeenCalled();
    });

    const container = screen.getByTestId("obras-mapa-container");
    const mapInner = container.firstElementChild as HTMLElement;

    // Simula scroll com tecla modificadora (deltaY >= 60 para acionamento imediato)
    const wheelEventWithModifier = new WheelEvent("wheel", {
      deltaY: -100,
      metaKey: true,
      ctrlKey: false,
      bubbles: true,
      cancelable: true,
    });

    mapInner.dispatchEvent(wheelEventWithModifier);

    // O aviso não deve estar presente
    expect(
      screen.queryByTestId("obras-mapa-zoom-hint"),
    ).not.toBeInTheDocument();

    // O zoom do mapa deve ter sido acionado
    expect(mockMap.setZoomAround).toHaveBeenCalledWith({ x: 100, y: 100 }, 14, {
      animate: true,
    });
  });

  it("prioriza executorNome no conteúdo do popup do marcador quando informado", async () => {
    const mockMarkers = [
      {
        idProjeto: "OBR-50",
        nomeObra: "Centro Cirúrgico",
        situacao: "em_execucao" as const,
        situacaoLabel: "Em Execução",
        situacaoColorHex: "#059669",
        latitude: -20.9634,
        longitude: -42.0408,
        isUrbana: true,
        valorInvestimentoFormatado: "R$ 1.450.000",
        percentualExecucaoFormatado: "78%",
        orgaoResponsavel: "Prefeitura Municipal",
        executorNome: "Fundo Municipal de Saúde",
        dataFimPrevistaFormatada: "31/12/2026",
      },
    ];

    render(
      <ObrasMapaInterativo
        markers={mockMarkers}
        center={[-20.9634, -42.0408]}
      />,
    );

    await waitFor(() => {
      expect(mockMarker.bindPopup).toHaveBeenCalledWith(
        expect.stringContaining("Fundo Municipal de Saúde"),
      );
    });
  });
});
