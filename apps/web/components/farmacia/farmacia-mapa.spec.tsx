import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("leaflet/dist/leaflet.css", () => ({}));

const leaflet = vi.hoisted(() => {
  const marcadores: {
    handlers: Record<string, () => void>;
    tooltip: string;
    setIcon: ReturnType<typeof vi.fn>;
  }[] = [];
  const icones: { html: string }[] = [];
  const camada = () => ({ addTo: vi.fn().mockReturnThis() });
  const L = {
    map: vi.fn(() => ({
      remove: vi.fn(),
      invalidateSize: vi.fn(),
      fitBounds: vi.fn(),
    })),
    control: { zoom: vi.fn(camada) },
    tileLayer: vi.fn(camada),
    layerGroup: vi.fn(() => ({ ...camada(), clearLayers: vi.fn() })),
    divIcon: vi.fn((opcoes: { html: string }) => {
      icones.push(opcoes);
      return opcoes;
    }),
    latLngBounds: vi.fn(() => ({})),
    marker: vi.fn(() => {
      const marcador = {
        handlers: {} as Record<string, () => void>,
        tooltip: "",
        setIcon: vi.fn(),
        bindTooltip(texto: string) {
          marcador.tooltip = texto;
        },
        on(evento: string, fn: () => void) {
          marcador.handlers[evento] = fn;
        },
        addTo: vi.fn(),
      };
      marcadores.push(marcador);
      return marcador;
    }),
  };
  return { L, marcadores, icones };
});

vi.mock("leaflet", () => ({ default: leaflet.L }));

const { FarmaciaMapa } = await import("./farmacia-mapa");

const marcadores = [
  {
    id: "u1",
    numero: 1,
    nome: "Farmácia <b>Central</b>",
    latitude: -20.9,
    longitude: -42,
  },
  {
    id: "u2",
    numero: 2,
    nome: "Módulo Norte",
    latitude: -20.8,
    longitude: -42.1,
  },
];

describe("FarmaciaMapa", () => {
  it("cria um divIcon numerado por marcador e liga os eventos", async () => {
    const onDestacar = vi.fn();
    const onSelecionar = vi.fn();
    render(
      <FarmaciaMapa
        marcadores={marcadores}
        idDestacado={null}
        onDestacar={onDestacar}
        onSelecionar={onSelecionar}
      />,
    );
    await waitFor(() =>
      expect(leaflet.marcadores.length).toBeGreaterThanOrEqual(2),
    );
    const [primeiro, segundo] = leaflet.marcadores.slice(-2);
    const htmls = leaflet.icones.slice(-2).map((i) => i.html);
    expect(htmls[0]).toContain(">1</div>");
    expect(htmls[1]).toContain(">2</div>");

    primeiro.handlers.click();
    expect(onSelecionar).toHaveBeenCalledWith("u1");
    segundo.handlers.mouseover();
    expect(onDestacar).toHaveBeenCalledWith("u2");
    segundo.handlers.mouseout();
    expect(onDestacar).toHaveBeenLastCalledWith(null);
  });

  it("escapa o nome da unidade no tooltip", async () => {
    render(
      <FarmaciaMapa
        marcadores={marcadores}
        idDestacado={null}
        onDestacar={vi.fn()}
        onSelecionar={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(
        leaflet.marcadores.some((m) => m.tooltip.includes("&lt;b&gt;")),
      ).toBe(true),
    );
    expect(leaflet.marcadores.some((m) => m.tooltip.includes("<b>"))).toBe(
      false,
    );
  });

  it("mudar o destaque apenas troca o icone, sem recriar marcadores", async () => {
    const props = { onDestacar: vi.fn(), onSelecionar: vi.fn() };
    const { rerender } = render(
      <FarmaciaMapa marcadores={marcadores} idDestacado={null} {...props} />,
    );
    await waitFor(() =>
      expect(leaflet.marcadores.length).toBeGreaterThanOrEqual(2),
    );
    const criados = leaflet.L.marker.mock.calls.length;
    rerender(
      <FarmaciaMapa marcadores={marcadores} idDestacado="u1" {...props} />,
    );
    await waitFor(() =>
      expect(
        leaflet.marcadores.some((m) => m.setIcon.mock.calls.length > 0),
      ).toBe(true),
    );
    expect(leaflet.L.marker.mock.calls.length).toBe(criados);
  });
});
