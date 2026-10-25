"use client";

import "leaflet/dist/leaflet.css";
import { TOKENS } from "@transparencia/ui";
import { useEffect, useRef } from "react";

export interface FarmaciaMapaMarcador {
  id: string;
  numero: number;
  nome: string;
  latitude: number;
  longitude: number;
}

export interface FarmaciaMapaProps {
  marcadores: FarmaciaMapaMarcador[];
  idDestacado: string | null;
  onDestacar: (id: string | null) => void;
  onSelecionar: (id: string) => void;
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlMarcador(numero: number, destacado: boolean): string {
  const tamanho = destacado ? 28 : 22;
  const halo = destacado
    ? `0 0 0 6px color-mix(in oklch, ${TOKENS.colors.accent} 22%, transparent)`
    : "none";
  return `<div style="width:${tamanho}px;height:${tamanho}px;border-radius:50%;background:${TOKENS.colors.accent};border:2px solid #fff;box-shadow:${halo};color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;">${numero}</div>`;
}

function iconeMarcador(
  L: typeof import("leaflet"),
  numero: number,
  destacado: boolean,
) {
  const tamanho = destacado ? 28 : 22;
  return L.divIcon({
    className: "farmacia-marcador",
    html: htmlMarcador(numero, destacado),
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
  });
}

/** Mapa Leaflet (tiles Esri, igual a Obras) com marcadores numerados por unidade. */
export function FarmaciaMapa({
  marcadores,
  idDestacado,
  onDestacar,
  onSelecionar,
}: FarmaciaMapaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<import("leaflet").Map | null>(null);
  const grupoRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const marcadoresLeafletRef = useRef<Map<string, import("leaflet").Marker>>(
    new Map(),
  );
  const callbacksRef = useRef({ onDestacar, onSelecionar });
  callbacksRef.current = { onDestacar, onSelecionar };
  const marcadoresRef = useRef(marcadores);
  marcadoresRef.current = marcadores;
  const idDestacadoRef = useRef(idDestacado);
  idDestacadoRef.current = idDestacado;
  const assinaturaMarcadores = marcadores
    .map((m) => `${m.id}:${m.numero}:${m.latitude}:${m.longitude}`)
    .join("|");

  // Recria os marcadores e reenquadra só quando o conjunto muda (nova busca).
  function redesenhar() {
    const L = leafletRef.current;
    const mapa = mapaRef.current;
    const grupo = grupoRef.current;
    if (!L || !mapa || !grupo) return;
    const atuais = marcadoresRef.current;
    grupo.clearLayers();
    marcadoresLeafletRef.current.clear();
    atuais.forEach((m) => {
      const marcador = L.marker([m.latitude, m.longitude], {
        icon: iconeMarcador(L, m.numero, m.id === idDestacadoRef.current),
        title: m.nome,
        keyboard: false,
      });
      marcador.bindTooltip(escapeHtml(m.nome), { direction: "top" });
      marcador.on("mouseover", () => callbacksRef.current.onDestacar(m.id));
      marcador.on("mouseout", () => callbacksRef.current.onDestacar(null));
      marcador.on("click", () => callbacksRef.current.onSelecionar(m.id));
      marcador.addTo(grupo);
      marcadoresLeafletRef.current.set(m.id, marcador);
    });
    mapa.invalidateSize();
    if (atuais.length > 0) {
      mapa.fitBounds(
        L.latLngBounds(atuais.map((m) => [m.latitude, m.longitude])),
        { padding: [36, 36], maxZoom: 14 },
      );
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: o mapa é criado uma única vez; os dados mais recentes vêm das refs
  useEffect(() => {
    let montado = true;
    (async () => {
      if (!containerRef.current || mapaRef.current) return;
      const L = (await import("leaflet")).default;
      if (!montado || !containerRef.current) return;
      leafletRef.current = L;
      const mapa = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
      });
      L.control.zoom({ position: "topright" }).addTo(mapa);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>',
          maxZoom: 16,
        },
      ).addTo(mapa);
      grupoRef.current = L.layerGroup().addTo(mapa);
      mapaRef.current = mapa;
      redesenhar();
    })();

    return () => {
      montado = false;
      mapaRef.current?.remove();
      mapaRef.current = null;
      grupoRef.current = null;
      marcadoresLeafletRef.current.clear();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: depende apenas da assinatura do conjunto
  useEffect(() => {
    redesenhar();
  }, [assinaturaMarcadores]);

  // Destaque só troca o ícone, sem recriar marcadores (evita flicker no hover).
  useEffect(() => {
    const L = leafletRef.current;
    if (!L) return;
    marcadoresRef.current.forEach((m) => {
      marcadoresLeafletRef.current
        .get(m.id)
        ?.setIcon(iconeMarcador(L, m.numero, m.id === idDestacado));
    });
  }, [idDestacado]);

  return (
    <div
      ref={containerRef}
      data-testid="farmacia-mapa"
      role="application"
      aria-label="Mapa das unidades com o medicamento em estoque"
      className="h-full w-full"
    />
  );
}
