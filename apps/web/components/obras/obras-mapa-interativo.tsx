"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { cn } from "@transparencia/ui";
import type { ObraMarkerItem } from "@/app/[portalSlug]/obras/view-model";

export interface ObrasMapaInterativoProps {
  markers: ObraMarkerItem[];
  center: [number, number];
  zoom?: number;
  urbanBounds?: [[number, number], [number, number]] | null;
  territorioBounds?: [[number, number], [number, number]] | null;
  viewMode?: "urbana" | "territorio";
  selectedObraId?: string | null;
  onSelectObra?: (idProjeto: string) => void;
  className?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function ObrasMapaInterativo({
  markers,
  center,
  zoom = 13,
  urbanBounds,
  territorioBounds,
  viewMode = "urbana",
  selectedObraId,
  onSelectObra,
  className = "",
}: ObrasMapaInterativoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markersGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, import("leaflet").Marker>>(
    new Map(),
  );
  const [isMac, setIsMac] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showZoomHint = useCallback(() => {
    setShowHint(true);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    hintTimeoutRef.current = setTimeout(() => {
      setShowHint(false);
    }, 1500);
  }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const platform =
        (navigator as unknown as { userAgentData?: { platform?: string } })
          .userAgentData?.platform ||
        navigator.platform ||
        navigator.userAgent ||
        "";
      setIsMac(/Mac|iPhone|iPod|iPad/i.test(platform));
    }

    const container = containerRef.current;
    const handleMouseLeave = () => {
      setShowHint(false);
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };

    let accumulatedDelta = 0;
    let zoomDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastMousePoint: import("leaflet").Point | null = null;

    const handleWheel = (e: WheelEvent) => {
      const hasModifier = e.metaKey || e.ctrlKey;

      if (!hasModifier) {
        // Sem Cmd/Ctrl: o scroll da página continua normal, exibe aviso
        showZoomHint();
        return;
      }

      // Com Cmd/Ctrl: intercepta e aplica zoom no mapa Leaflet
      e.preventDefault();
      e.stopPropagation();
      setShowHint(false);

      const map = mapInstanceRef.current;
      if (!map) return;

      lastMousePoint = map.mouseEventToContainerPoint(e);
      accumulatedDelta += e.deltaY;

      // Executa imediatamente para deltas grandes (ex: clique da roda do mouse)
      if (Math.abs(accumulatedDelta) >= 60) {
        if (zoomDebounceTimer) {
          clearTimeout(zoomDebounceTimer);
          zoomDebounceTimer = null;
        }
        const zoomDelta = accumulatedDelta < 0 ? 1 : -1;
        accumulatedDelta = 0;
        const currentZoom = map.getZoom();
        const nextZoom = Math.max(
          map.getMinZoom(),
          Math.min(map.getMaxZoom(), currentZoom + zoomDelta),
        );
        if (nextZoom !== currentZoom && lastMousePoint) {
          map.setZoomAround(lastMousePoint, nextZoom, { animate: true });
        }
        return;
      }

      // Debounce para gestos contínuos de trackpad
      if (zoomDebounceTimer) {
        clearTimeout(zoomDebounceTimer);
      }
      zoomDebounceTimer = setTimeout(() => {
        if (
          Math.abs(accumulatedDelta) >= 20 &&
          mapInstanceRef.current &&
          lastMousePoint
        ) {
          const m = mapInstanceRef.current;
          const zoomDelta = accumulatedDelta < 0 ? 1 : -1;
          accumulatedDelta = 0;
          const currentZoom = m.getZoom();
          const nextZoom = Math.max(
            m.getMinZoom(),
            Math.min(m.getMaxZoom(), currentZoom + zoomDelta),
          );
          if (nextZoom !== currentZoom) {
            m.setZoomAround(lastMousePoint, nextZoom, { animate: true });
          }
        } else {
          accumulatedDelta = 0;
        }
      }, 60);
    };

    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
      if (zoomDebounceTimer) {
        clearTimeout(zoomDebounceTimer);
      }
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, [showZoomHint]);

  // Função para desenhar os marcadores redondos minimalistas
  const renderMarkers = useCallback(
    (
      L: typeof import("leaflet"),
      _map: import("leaflet").Map,
      group: import("leaflet").LayerGroup,
    ) => {
      group.clearLayers();
      markersMapRef.current.clear();

      markers.forEach((m) => {
        const isSelected = selectedObraId === m.idProjeto;
        const size = isSelected ? 20 : 14;
        const border = isSelected ? "3px solid #ffffff" : "2px solid #ffffff";
        const shadow = isSelected
          ? "0 0 0 3px rgba(37,99,235,0.45), 0 2px 6px rgba(0,0,0,0.35)"
          : "0 1px 4px rgba(0,0,0,0.35)";

        const html = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${m.situacaoColorHex};
          border-radius: 50%;
          border: ${border};
          box-shadow: ${shadow};
          cursor: pointer;
        "></div>
      `;

        const icon = L.divIcon({
          className: "obra-custom-pin",
          html,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2],
        });

        const marker = L.marker([m.latitude, m.longitude], {
          icon,
          title: m.nomeObra,
        });

        const nomeObraEscaped = escapeHtml(m.nomeObra);
        const orgaoEscaped = escapeHtml(m.executorNome || m.orgaoResponsavel);
        const investimentoEscaped = escapeHtml(m.valorInvestimentoFormatado);
        const percentualEscaped = escapeHtml(m.percentualExecucaoFormatado);
        const dataFimEscaped = escapeHtml(m.dataFimPrevistaFormatada);

        const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 220px;">
          <div style="font-weight: 700; margin-bottom: 3px; color: #0f172a;">${nomeObraEscaped}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${orgaoEscaped}</div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
            <span style="color: #64748b;">Investimento:</span>
            <span style="font-weight: 600; color: #0f172a;">${investimentoEscaped}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
            <span style="color: #64748b;">Avanço:</span>
            <span style="font-weight: 600; color: #2563eb;">${percentualEscaped}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; color: #64748b;">
            <span>Previsão:</span>
            <span>${dataFimEscaped}</span>
          </div>
        </div>
      `;

        marker.bindPopup(popupHtml);

        marker.on("click", () => {
          onSelectObra?.(m.idProjeto);
        });

        marker.addTo(group);
        markersMapRef.current.set(m.idProjeto, marker);
      });
    },
    [markers, selectedObraId, onSelectObra],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: mapa Leaflet deve inicializar apenas na montagem
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;
      if (!isMounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      // Tiles Esri World Light Gray Base (exatamente como no mockup Tiles © Esri)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>',
          maxZoom: 16,
        },
      ).addTo(map);

      map.invalidateSize();
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);

      const markersGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      markersGroupRef.current = markersGroup;

      renderMarkers(L, map, markersGroup);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersGroupRef.current = null;
        markersMapRef.current.clear();
      }
    };
  }, []);

  // Atualiza marcadores quando a lista de marcadores ou a seleção mudar
  useEffect(() => {
    async function updateMarkers() {
      if (!mapInstanceRef.current || !markersGroupRef.current) return;
      const L = (await import("leaflet")).default;
      renderMarkers(L, mapInstanceRef.current, markersGroupRef.current);

      if (selectedObraId) {
        const selectedMarker = markersMapRef.current.get(selectedObraId);
        if (selectedMarker) {
          const latLng = selectedMarker.getLatLng();
          mapInstanceRef.current.flyTo(latLng, 16, {
            animate: true,
            duration: 0.8,
          });
          selectedMarker.openPopup();
        }
      }
    }
    updateMarkers();
  }, [renderMarkers, selectedObraId]);

  // Alterna visualização entre Área Urbana e Todo o Território
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      typeof mapInstanceRef.current.fitBounds !== "function"
    ) {
      return;
    }
    if (viewMode === "urbana" && urbanBounds) {
      mapInstanceRef.current.fitBounds(urbanBounds, {
        padding: [35, 35],
        maxZoom: 15,
        animate: true,
      });
    } else if (viewMode === "territorio" && territorioBounds) {
      mapInstanceRef.current.fitBounds(territorioBounds, {
        padding: [35, 35],
        maxZoom: 14,
        animate: true,
      });
    }
  }, [viewMode, urbanBounds, territorioBounds]);

  return (
    <div
      data-testid="obras-mapa-container"
      className={cn(
        "relative z-9 h-full w-full overflow-hidden bg-[#e5e5e5]",
        className,
      )}
    >
      <div ref={containerRef} className="h-full min-h-[580px] w-full" />
      {showHint && (
        <div
          data-testid="obras-mapa-zoom-hint"
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-1000 flex items-center justify-center bg-black/45 backdrop-blur-[2px] transition-opacity duration-200"
        >
          <div className="rounded-xl border border-white/20 bg-slate-900/90 px-4 py-2.5 text-center font-medium text-sm text-white shadow-xl">
            Use{" "}
            <span className="font-semibold text-amber-400">
              {isMac ? "⌘ (Command)" : "Ctrl"}
            </span>{" "}
            + scroll para aplicar zoom no mapa
          </div>
        </div>
      )}
      {markers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-xs">
          <p className="font-medium text-slate-500 text-sm">
            Nenhuma obra com localização cadastrada para os filtros
            selecionados.
          </p>
        </div>
      )}
    </div>
  );
}
