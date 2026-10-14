import { describe, expect, it } from "vitest";
import { getTileCoordinates, projectCoordToTilePercent } from "./tile-calc";

describe("tile-calc", () => {
  it("converte coordenadas geográficas para coordenadas de tile corretas em zoom 14", () => {
    // Porciúncula central: aprox -20.9634, -42.0408
    const tile = getTileCoordinates(-20.9634, -42.0408, 14);
    expect(tile.zoom).toBe(14);
    expect(tile.x).toBeGreaterThan(0);
    expect(tile.y).toBeGreaterThan(0);
    expect(Number.isInteger(tile.x)).toBe(true);
    expect(Number.isInteger(tile.y)).toBe(true);
  });

  it("calcula a posição percentual relativa de uma coordenada dentro do tile de zoom 14", () => {
    const centerLat = -20.9634;
    const centerLng = -42.0408;
    const tile = getTileCoordinates(centerLat, centerLng, 14);

    const pos = projectCoordToTilePercent(centerLat, centerLng, tile);
    expect(pos.xPercent).toBeGreaterThanOrEqual(0);
    expect(pos.xPercent).toBeLessThanOrEqual(100);
    expect(pos.yPercent).toBeGreaterThanOrEqual(0);
    expect(pos.yPercent).toBeLessThanOrEqual(100);
  });

  it("gera url oficial de tile do ArcGIS Gray Base", () => {
    const tile = getTileCoordinates(-20.9634, -42.0408, 14);
    expect(tile.url).toContain(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/14/",
    );
    expect(tile.url).toContain(`/${tile.y}/${tile.x}`);
  });
});
