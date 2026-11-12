import { describe, expect, it } from "vitest";
import {
  getTileCoordinates,
  offsetFromCenterPx,
  projectCoordToTilePercent,
  TILE_SIZE_PX,
  tilesAroundCenter,
} from "./tile-calc";

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

describe("tile-calc - grade centrada", () => {
  const centro: [number, number] = [-20.9634, -42.0408];

  it("o próprio centro fica a 0px do meio da grade", () => {
    expect(offsetFromCenterPx([centro[0], centro[1]], centro, 13)).toEqual({
      dx: 0,
      dy: 0,
    });
  });

  it("ponto a leste fica à direita e ponto ao sul fica abaixo", () => {
    const leste = offsetFromCenterPx([centro[0], centro[1] + 0.01], centro, 13);
    const sul = offsetFromCenterPx([centro[0] - 0.01, centro[1]], centro, 13);
    expect(leste.dx).toBeGreaterThan(0);
    expect(leste.dy).toBeCloseTo(0, 6);
    expect(sul.dy).toBeGreaterThan(0);
  });

  it("os tiles cobrem a área pedida ao redor do centro", () => {
    const tiles = tilesAroundCenter(centro, 13, {
      halfWidthPx: 400,
      halfHeightPx: 100,
    });
    const left = Math.min(...tiles.map((t) => t.dx));
    const right = Math.max(...tiles.map((t) => t.dx + TILE_SIZE_PX));
    const top = Math.min(...tiles.map((t) => t.dy));
    const bottom = Math.max(...tiles.map((t) => t.dy + TILE_SIZE_PX));
    expect(left).toBeLessThanOrEqual(-400);
    expect(right).toBeGreaterThanOrEqual(400);
    expect(top).toBeLessThanOrEqual(-100);
    expect(bottom).toBeGreaterThanOrEqual(100);
    expect(new Set(tiles.map((t) => t.url)).size).toBe(tiles.length);
  });
});
