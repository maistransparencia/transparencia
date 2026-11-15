import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaticTileMap } from "./static-tile-map";

const base = { alt: "mapa" };

describe("StaticTileMap", () => {
  it("nao renderiza sem marcadores validos", () => {
    const { container } = render(
      <StaticTileMap
        {...base}
        markers={[
          { id: "a", latitude: 0, longitude: 0 },
          { id: "b", latitude: Number.NaN, longitude: -42 },
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("filtra invalidos, posiciona entre 0 e 100 e respeita maxMarkers", () => {
    const markers = [
      { id: "a", latitude: -20.9, longitude: -42.0 },
      { id: "b", latitude: -20.9001, longitude: -42.0001 },
      { id: "c", latitude: -20.9002, longitude: -42.0002 },
      { id: "z", latitude: 0, longitude: 0 },
    ];
    const { container } = render(
      <StaticTileMap {...base} markers={markers} maxMarkers={2} />,
    );
    const pontos = container.querySelectorAll("span[style]");
    expect(pontos).toHaveLength(2);
    pontos.forEach((ponto) => {
      const { left, top } = (ponto as HTMLElement).style;
      expect(Number.parseFloat(left)).toBeGreaterThanOrEqual(0);
      expect(Number.parseFloat(left)).toBeLessThanOrEqual(100);
      expect(Number.parseFloat(top)).toBeGreaterThanOrEqual(0);
      expect(Number.parseFloat(top)).toBeLessThanOrEqual(100);
    });
  });

  it("ignora coordenadas fora da faixa Web Mercator", () => {
    const { container } = render(
      <StaticTileMap
        {...base}
        markers={[
          { id: "a", latitude: 90, longitude: 10 },
          { id: "b", latitude: 10, longitude: 190 },
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("ajusta o zoom para que marcadores distantes caibam no mesmo tile", () => {
    const { container } = render(
      <StaticTileMap
        {...base}
        markers={[
          { id: "a", latitude: -20.9, longitude: -42.0 },
          { id: "longe", latitude: -10, longitude: -50 },
        ]}
      />,
    );
    expect(container.querySelectorAll("span[style]")).toHaveLength(2);
  });

  it("mostra legenda quando maxMarkers corta marcadores e nao mostra caso contrario", () => {
    const markers = [
      { id: "a", latitude: -20.9, longitude: -42.0 },
      { id: "b", latitude: -20.9001, longitude: -42.0001 },
      { id: "c", latitude: -20.9002, longitude: -42.0002 },
    ];
    const cortado = render(
      <StaticTileMap {...base} markers={markers} maxMarkers={2} />,
    );
    expect(cortado.getByText("2 de 3 unidades no mapa")).toBeInTheDocument();
    cortado.unmount();
    const completo = render(<StaticTileMap {...base} markers={markers} />);
    expect(completo.queryByText(/unidades no mapa/)).toBeNull();
  });

  it("mantem marcadores dentro da area visivel e exibe atribuicao", () => {
    const { container, getByText } = render(
      <StaticTileMap
        {...base}
        markers={[
          { id: "a", latitude: -20.9, longitude: -42.0 },
          { id: "b", latitude: -20.9, longitude: -42.0 },
        ]}
      />,
    );
    container.querySelectorAll("span[style]").forEach((ponto) => {
      const { left, top } = (ponto as HTMLElement).style;
      expect(Number.parseFloat(left)).toBeGreaterThanOrEqual(3);
      expect(Number.parseFloat(left)).toBeLessThanOrEqual(97);
      expect(Number.parseFloat(top)).toBeGreaterThanOrEqual(3);
      expect(Number.parseFloat(top)).toBeLessThanOrEqual(97);
    });
    expect(getByText(/Esri/)).toBeInTheDocument();
  });
});
