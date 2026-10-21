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

  it("omite marcadores fora do tile", () => {
    const { container } = render(
      <StaticTileMap
        {...base}
        markers={[
          { id: "a", latitude: -20.9, longitude: -42.0 },
          { id: "b", latitude: -20.9, longitude: -42.0 },
          { id: "longe", latitude: -10, longitude: -50 },
        ]}
      />,
    );
    expect(container.querySelectorAll("span[style]")).toHaveLength(2);
  });
});
