import Image from "next/image";
import {
  getTileCoordinates,
  isValidMapCoordinate,
  projectCoordToTilePercent,
} from "@/lib/tile-calc";

export interface StaticTileMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  className?: string;
}

export interface StaticTileMapProps {
  markers: StaticTileMapMarker[];
  alt: string;
  /** Teto do zoom; o zoom efetivo é o maior em que todos os marcadores cabem num tile. */
  zoom?: number;
  maxMarkers?: number;
  className?: string;
}

const DEFAULT_MARKER_CLASS = "bg-blue-500 ring-blue-300";
const MARKER_INSET_MIN_PERCENT = 3;
const MARKER_INSET_MAX_PERCENT = 97;

function clampMarkerPercent(value: number): number {
  return Math.min(
    Math.max(value, MARKER_INSET_MIN_PERCENT),
    MARKER_INSET_MAX_PERCENT,
  );
}

function findFittingZoom(
  markers: StaticTileMapMarker[],
  maxZoom: number,
): number {
  const fits = (candidateZoom: number): boolean => {
    const tiles = markers.map((m) =>
      getTileCoordinates(m.latitude, m.longitude, candidateZoom),
    );
    return tiles.every((t) => t.x === tiles[0].x && t.y === tiles[0].y);
  };
  const candidates = Array.from({ length: maxZoom + 1 }, (_, i) => maxZoom - i);
  return candidates.find(fits) ?? 0;
}

/**
 * Mini-mapa estático (tile Web Mercator) com marcadores sobrepostos.
 * O zoom é o maior em que todos os marcadores válidos cabem em um único
 * tile e o centro é o do bounding box; sem marcadores válidos nada é
 * renderizado, evitando qualquer centro fixo de município.
 */
export function StaticTileMap({
  markers,
  alt,
  zoom = 14,
  maxMarkers = 15,
  className = "",
}: StaticTileMapProps) {
  const validMarkers = markers.filter((m) =>
    isValidMapCoordinate(m.latitude, m.longitude),
  );

  if (validMarkers.length === 0) return null;

  const latitudes = validMarkers.map((m) => m.latitude);
  const longitudes = validMarkers.map((m) => m.longitude);
  const centerLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const centerLongitude =
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2;

  const effectiveZoom = findFittingZoom(validMarkers, zoom);
  const tileInfo = getTileCoordinates(
    centerLatitude,
    centerLongitude,
    effectiveZoom,
  );

  const positionedMarkers = validMarkers
    .filter((m) => {
      const tile = getTileCoordinates(m.latitude, m.longitude, effectiveZoom);
      return tile.x === tileInfo.x && tile.y === tileInfo.y;
    })
    .map((m) => ({
      ...m,
      distanceToCenter:
        (m.latitude - centerLatitude) ** 2 +
        (m.longitude - centerLongitude) ** 2,
      ...projectCoordToTilePercent(m.latitude, m.longitude, tileInfo),
    }))
    .sort((a, b) => a.distanceToCenter - b.distanceToCenter)
    .slice(0, maxMarkers);

  if (positionedMarkers.length === 0) return null;

  const hasMarkersOmitted = positionedMarkers.length < validMarkers.length;

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <Image
          src={tileInfo.url}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 320px"
          className="object-cover"
          unoptimized
        />
        <div className="pointer-events-none absolute inset-0">
          {positionedMarkers.map((m) => (
            <span
              key={m.id}
              style={{
                left: `${clampMarkerPercent(m.xPercent)}%`,
                top: `${clampMarkerPercent(m.yPercent)}%`,
              }}
              className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm ring-2 ${m.className ?? DEFAULT_MARKER_CLASS}`}
            />
          ))}
        </div>
        <span className="absolute right-1 bottom-1 rounded bg-white/80 px-1 text-[10px] text-slate-600">
          Tiles © Esri
        </span>
      </div>
      {hasMarkersOmitted && (
        <p className="mt-1 text-[11px] text-subtleText">
          {positionedMarkers.length} de {validMarkers.length} unidades no mapa
        </p>
      )}
    </div>
  );
}
