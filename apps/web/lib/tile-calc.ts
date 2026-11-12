/**
 * Utilitários para projeção de coordenadas e obtenção de tiles de mapas estáticos (Slippy Map / Web Mercator).
 */

export interface TileInfo {
  x: number;
  y: number;
  zoom: number;
  url: string;
}

export interface TileRelativePercent {
  xPercent: number;
  yPercent: number;
}

export const TILE_SIZE_PX = 256;

const tileUrl = (x: number, y: number, zoom: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${zoom}/${y}/${x}`;

/** Posição contínua (com fração) da coordenada na grade de tiles do zoom. */
const exactTilePosition = (lat: number, lng: number, zoom: number) => {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y:
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      n,
  };
};

/**
 * Converte latitude e longitude em índices de tile (x, y) de acordo com a projeção padrão Web Mercator.
 */
export function getTileCoordinates(
  lat: number,
  lng: number,
  zoom = 14,
): TileInfo {
  const exact = exactTilePosition(lat, lng, zoom);
  const x = Math.floor(exact.x);
  const y = Math.floor(exact.y);
  return { x, y, zoom, url: tileUrl(x, y, zoom) };
}

/** Distância em pixels de uma coordenada até o centro do mapa, no zoom dado. */
export function offsetFromCenterPx(
  coordinate: [number, number],
  center: [number, number],
  zoom: number,
): { dx: number; dy: number } {
  const point = exactTilePosition(coordinate[0], coordinate[1], zoom);
  const origin = exactTilePosition(center[0], center[1], zoom);
  return {
    dx: (point.x - origin.x) * TILE_SIZE_PX,
    dy: (point.y - origin.y) * TILE_SIZE_PX,
  };
}

export interface CenteredTile {
  url: string;
  /** Canto superior esquerdo do tile, em pixels a partir do centro do mapa. */
  dx: number;
  dy: number;
}

/**
 * Tiles que cobrem um retângulo centrado na coordenada: o centro cai no meio da
 * imagem, e não na borda de um tile único.
 */
export function tilesAroundCenter(
  center: [number, number],
  zoom: number,
  area: { halfWidthPx: number; halfHeightPx: number },
): CenteredTile[] {
  const origin = exactTilePosition(center[0], center[1], zoom);
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const columns = range(
    Math.floor(origin.x - area.halfWidthPx / TILE_SIZE_PX),
    Math.floor(origin.x + area.halfWidthPx / TILE_SIZE_PX),
  );
  const rows = range(
    Math.floor(origin.y - area.halfHeightPx / TILE_SIZE_PX),
    Math.floor(origin.y + area.halfHeightPx / TILE_SIZE_PX),
  );
  return rows.flatMap((y) =>
    columns.map((x) => ({
      url: tileUrl(x, y, zoom),
      dx: (x - origin.x) * TILE_SIZE_PX,
      dy: (y - origin.y) * TILE_SIZE_PX,
    })),
  );
}

/**
 * Calcula a posição percentual (0 a 100%) de uma coordenada geográfica dentro de um tile específico.
 */
export function projectCoordToTilePercent(
  lat: number,
  lng: number,
  tile: TileInfo,
): TileRelativePercent {
  const n = 2 ** tile.zoom;
  const exactX = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const exactY =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const xFraction = exactX - tile.x;
  const yFraction = exactY - tile.y;

  return {
    xPercent: Math.min(Math.max(xFraction * 100, 0), 100),
    yPercent: Math.min(Math.max(yFraction * 100, 0), 100),
  };
}

export const MAX_LATITUDE_WEB_MERCATOR = 85.0511;
export const MAX_LONGITUDE = 180;

/**
 * Coordenada utilizável no mapa: finita, dentro dos limites Web Mercator e
 * diferente do ponto nulo (0, 0).
 */
export function isValidMapCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (latitude == null || longitude == null) return false;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= MAX_LATITUDE_WEB_MERCATOR &&
    Math.abs(longitude) <= MAX_LONGITUDE &&
    !(latitude === 0 && longitude === 0)
  );
}
