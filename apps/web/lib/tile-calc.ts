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

/**
 * Converte latitude e longitude em índices de tile (x, y) de acordo com a projeção padrão Web Mercator.
 */
export function getTileCoordinates(
  lat: number,
  lng: number,
  zoom = 14,
): TileInfo {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );

  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${zoom}/${y}/${x}`;

  return { x, y, zoom, url };
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
