import Image from "next/image";
import { getTileCoordinates, projectCoordToTilePercent } from "@/lib/tile-calc";

export interface StaticTileMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  className?: string;
}

export interface StaticTileMapProps {
  markers: StaticTileMapMarker[];
  alt: string;
  zoom?: number;
  maxMarkers?: number;
  className?: string;
}

const DEFAULT_MARKER_CLASS = "bg-blue-500 ring-blue-300";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Mini-mapa estático (tile Web Mercator) com marcadores sobrepostos.
 * O centro é a mediana das coordenadas recebidas; sem marcadores válidos
 * nada é renderizado, evitando qualquer centro fixo de município.
 */
export function StaticTileMap({
  markers,
  alt,
  zoom = 14,
  maxMarkers = 15,
  className = "",
}: StaticTileMapProps) {
  const validMarkers = markers.filter(
    (m) =>
      Number.isFinite(m.latitude) &&
      Number.isFinite(m.longitude) &&
      !(m.latitude === 0 && m.longitude === 0),
  );

  if (validMarkers.length === 0) return null;

  const tileInfo = getTileCoordinates(
    median(validMarkers.map((m) => m.latitude)),
    median(validMarkers.map((m) => m.longitude)),
    zoom,
  );

  // projectCoordToTilePercent satura em 0-100; marcadores de outro tile seriam
  // desenhados na borda, por isso são descartados pelo índice do tile.
  const positionedMarkers = validMarkers
    .filter((m) => {
      const tile = getTileCoordinates(m.latitude, m.longitude, zoom);
      return tile.x === tileInfo.x && tile.y === tileInfo.y;
    })
    .map((m) => ({
      ...m,
      ...projectCoordToTilePercent(m.latitude, m.longitude, tileInfo),
    }));

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className}`}
    >
      <Image
        src={tileInfo.url}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 320px"
        className="object-cover"
        unoptimized
      />
      <div className="pointer-events-none absolute inset-0">
        {positionedMarkers.slice(0, maxMarkers).map((m) => (
          <span
            key={m.id}
            style={{ left: `${m.xPercent}%`, top: `${m.yPercent}%` }}
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm ring-2 ${m.className ?? DEFAULT_MARKER_CLASS}`}
          />
        ))}
      </div>
    </div>
  );
}
