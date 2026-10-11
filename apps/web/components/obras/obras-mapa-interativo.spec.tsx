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

const mockScrollWheelZoom = {
  _onWheelScroll: vi.fn(),
};

const mockMap = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  remove: vi.fn(),
  invalidateSize: vi.fn(),
  scrollWheelZoom: mockScrollWheelZoom,
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

  it("exibe aviso de zoom quando o usuário rola sem tecla modificadora (Cmd/Ctrl)", async () => {
    const originalHandler = vi.fn();
    mockScrollWheelZoom._onWheelScroll = originalHandler;

    render(<ObrasMapaInterativo markers={[]} center={[-20.9634, -42.0408]} />);

    await waitFor(() => {
      expect(L.map).toHaveBeenCalled();
    });

    // Simula scroll sem tecla modificadora
    const wheelEventWithoutModifier = new WheelEvent("wheel", {
      deltaY: 100,
      metaKey: false,
      ctrlKey: false,
    });

    mockScrollWheelZoom._onWheelScroll(wheelEventWithoutModifier);

    // O aviso deve ser exibido
    await waitFor(() => {
      expect(screen.getByTestId("obras-mapa-zoom-hint")).toBeInTheDocument();
      expect(
        screen.getByText(/scroll para aplicar zoom no mapa/i),
      ).toBeInTheDocument();
    });

    // O handler original de zoom do Leaflet não deve ter sido acionado
    expect(originalHandler).not.toHaveBeenCalled();
  });

  it("permite zoom e oculta aviso quando a tecla modificadora (Cmd ou Ctrl) está pressionada", async () => {
    const originalHandler = vi.fn();
    mockScrollWheelZoom._onWheelScroll = originalHandler;

    render(<ObrasMapaInterativo markers={[]} center={[-20.9634, -42.0408]} />);

    await waitFor(() => {
      expect(L.map).toHaveBeenCalled();
    });

    // Simula scroll com tecla modificadora
    const wheelEventWithModifier = new WheelEvent("wheel", {
      deltaY: 100,
      metaKey: true,
      ctrlKey: false,
    });

    mockScrollWheelZoom._onWheelScroll(wheelEventWithModifier);

    // O aviso não deve estar presente
    expect(
      screen.queryByTestId("obras-mapa-zoom-hint"),
    ).not.toBeInTheDocument();

    // O handler original de zoom do Leaflet deve ter sido acionado
    expect(originalHandler).toHaveBeenCalledWith(wheelEventWithModifier);
  });
});
