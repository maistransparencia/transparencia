"use client";

import { useCallback, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { ObraMarkerItem } from "@/app/[portalSlug]/obras/view-model";

export interface ObrasMapaInterativoProps {
  markers: ObraMarkerItem[];
  center: [number, number];
  zoom?: number;
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

  // Função para desenhar os marcadores
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
        const size = isSelected ? 32 : 24;
        const innerSize = isSelected ? 12 : 8;

        const html = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${m.situacaoColorHex};
          border-radius: 50%;
          border: ${isSelected ? "3px solid #ffffff" : "2px solid #ffffff"};
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <div style="width: ${innerSize}px; height: ${innerSize}px; background-color: #ffffff; border-radius: 50%;"></div>
        </div>
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
        const orgaoEscaped = escapeHtml(m.orgaoResponsavel);
        const investimentoEscaped = escapeHtml(m.valorInvestimentoFormatado);
        const percentualEscaped = escapeHtml(m.percentualExecucaoFormatado);
        const dataFimEscaped = escapeHtml(m.dataFimPrevistaFormatada);

        const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 200px;">
          <div style="font-weight: 700; margin-bottom: 3px; color: #0f172a;">${nomeObraEscaped}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${orgaoEscaped}</div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
            <span style="color: #64748b;">Investimento:</span>
            <span style="font-weight: 600; color: #0f172a;">${investimentoEscaped}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
            <span style="color: #64748b;">Avanço:</span>
            <span style="font-weight: 600; color: #059669;">${percentualEscaped}</span>
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

  // Inicializa o mapa Leaflet
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
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

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
  }, [renderMarkers, center, zoom]);

  // Atualiza marcadores quando a lista de marcadores ou a seleção mudar
  useEffect(() => {
    async function updateMarkers() {
      if (!mapInstanceRef.current || !markersGroupRef.current) return;
      const L = (await import("leaflet")).default;
      renderMarkers(L, mapInstanceRef.current, markersGroupRef.current);
    }
    updateMarkers();
  }, [renderMarkers]);

  // Centraliza e abre popup da obra selecionada
  useEffect(() => {
    if (!selectedObraId || !mapInstanceRef.current) return;

    const selectedMarker = markersMapRef.current.get(selectedObraId);
    if (selectedMarker) {
      const latLng = selectedMarker.getLatLng();
      mapInstanceRef.current.flyTo(latLng, 15, {
        animate: true,
        duration: 0.8,
      });
      selectedMarker.openPopup();
    }
  }, [selectedObraId]);

  return (
    <div
      data-testid="obras-mapa-container"
      className={`relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className}`}
    >
      <div ref={containerRef} className="h-full min-h-[380px] w-full" />
      {markers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-xs">
          <p className="font-medium text-slate-500 text-sm">
            Nenhuma obra georreferenciada para os filtros selecionados.
          </p>
        </div>
      )}
    </div>
  );
}
