"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type TipoAvisoMapa = "desktop" | "touch";

const DURACAO_AVISO_MS = 1500;

function ajustarZoom(
  mapa: import("leaflet").Map,
  ponto: import("leaflet").Point,
  acumulado: number,
) {
  const passo = acumulado < 0 ? 1 : -1;
  const zoomAtual = mapa.getZoom();
  const proximoZoom = Math.max(
    mapa.getMinZoom(),
    Math.min(mapa.getMaxZoom(), zoomAtual + passo),
  );
  if (proximoZoom !== zoomAtual) {
    mapa.setZoomAround(ponto, proximoZoom, { animate: true });
  }
}

/**
 * Gestos do mapa Leaflet sem prender a rolagem da página: a roda só dá zoom
 * com Cmd/Ctrl e, no toque, o arraste exige dois dedos.
 */
export function useMapaGestos(
  containerRef: RefObject<HTMLDivElement | null>,
  mapaRef: RefObject<import("leaflet").Map | null>,
) {
  const [isMac, setIsMac] = useState(false);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [tipoAviso, setTipoAviso] = useState<TipoAvisoMapa>("desktop");
  const avisoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exibirAviso = useCallback((tipo: TipoAvisoMapa) => {
    setTipoAviso(tipo);
    setMostrarAviso(true);
    if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    avisoTimeoutRef.current = setTimeout(
      () => setMostrarAviso(false),
      DURACAO_AVISO_MS,
    );
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refs estáveis; os listeners são registrados uma única vez
  useEffect(() => {
    const plataforma =
      (navigator as unknown as { userAgentData?: { platform?: string } })
        .userAgentData?.platform ||
      navigator.platform ||
      navigator.userAgent ||
      "";
    setIsMac(/Mac|iPhone|iPod|iPad/i.test(plataforma));

    const container = containerRef.current;
    if (!container) return;

    const ocultarAviso = () => {
      setMostrarAviso(false);
      if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    };

    let deltaAcumulado = 0;
    let zoomTimer: ReturnType<typeof setTimeout> | null = null;
    let ultimoPonto: import("leaflet").Point | null = null;

    const handleWheel = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) {
        // Sem Cmd/Ctrl: a página continua rolando e o usuário recebe o aviso
        exibirAviso("desktop");
        return;
      }

      // Mapa ainda carregando: deixa o navegador tratar o Ctrl+roda
      const mapa = mapaRef.current;
      if (!mapa) return;

      e.preventDefault();
      e.stopPropagation();
      setMostrarAviso(false);

      ultimoPonto = mapa.mouseEventToContainerPoint(e);
      deltaAcumulado += e.deltaY;

      // Deltas grandes (clique da roda do mouse) aplicam zoom imediatamente
      if (Math.abs(deltaAcumulado) >= 60) {
        if (zoomTimer) {
          clearTimeout(zoomTimer);
          zoomTimer = null;
        }
        const acumulado = deltaAcumulado;
        deltaAcumulado = 0;
        ajustarZoom(mapa, ultimoPonto, acumulado);
        return;
      }

      // Gestos contínuos de trackpad são agrupados por debounce
      if (zoomTimer) clearTimeout(zoomTimer);
      zoomTimer = setTimeout(() => {
        const mapaAtual = mapaRef.current;
        if (Math.abs(deltaAcumulado) >= 20 && mapaAtual && ultimoPonto) {
          const acumulado = deltaAcumulado;
          deltaAcumulado = 0;
          ajustarZoom(mapaAtual, ultimoPonto, acumulado);
        } else {
          deltaAcumulado = 0;
        }
      }, 60);
    };

    let inicioToque: { x: number; y: number } | null = null;

    // `touches` conta todos os dedos na tela, mesmo em elementos diferentes
    const totalToques = (e: TouchEvent) => e.touches.length;

    const handleTouchStart = (e: TouchEvent) => {
      const mapa = mapaRef.current;
      if (!mapa) return;

      const toques = totalToques(e);
      if (toques === 1) {
        const toque = e.touches[0];
        inicioToque = { x: toque.clientX, y: toque.clientY };
        // 1 dedo não arrasta o mapa: libera a rolagem nativa da página
        if (typeof mapa.dragging?.disable === "function") {
          mapa.dragging.disable();
        }
      } else if (toques >= 2) {
        inicioToque = null;
        ocultarAviso();
        if (typeof mapa.dragging?.enable === "function") {
          mapa.dragging.enable();
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const toques = totalToques(e);
      if (toques === 1 && inicioToque) {
        const toque = e.touches[0];
        const distancia = Math.hypot(
          toque.clientX - inicioToque.x,
          toque.clientY - inicioToque.y,
        );
        if (distancia > 10) exibirAviso("touch");
      } else if (toques >= 2) {
        setMostrarAviso(false);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      inicioToque = null;
      if (totalToques(e) <= 1) {
        const mapa = mapaRef.current;
        if (typeof mapa?.dragging?.disable === "function") {
          mapa.dragging.disable();
        }
      }
    };

    const handleMouseDown = () => {
      const mapa = mapaRef.current;
      if (
        typeof mapa?.dragging?.enabled === "function" &&
        !mapa.dragging.enabled()
      ) {
        mapa.dragging.enable();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mouseleave", ocultarAviso);
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, {
      passive: true,
    });
    container.addEventListener("mousedown", handleMouseDown);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mouseleave", ocultarAviso);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      container.removeEventListener("mousedown", handleMouseDown);
      if (zoomTimer) clearTimeout(zoomTimer);
      if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    };
  }, []);

  return { isMac, mostrarAviso, tipoAviso };
}
