"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

const LARGURA_MINIMA_DESKTOP_PX = 640;

/** Envia ao PostHog o tempo visível acumulado na página a cada ocultação. */
export function LicitacoesTempoNaPagina() {
  useEffect(() => {
    let inicioVisivel: number | null =
      document.visibilityState === "hidden" ? null : Date.now();
    let acumuladoMs = 0;

    const encerrarIntervalo = () => {
      if (inicioVisivel === null) return;
      acumuladoMs += Date.now() - inicioVisivel;
      inicioVisivel = null;
    };

    const enviarPermanencia = () => {
      encerrarIntervalo();
      if (acumuladoMs <= 0) return;
      posthog.capture("licitacoes_tempo_na_pagina", {
        segundos: Math.round(acumuladoMs / 1000),
        tipo_viewport:
          window.innerWidth >= LARGURA_MINIMA_DESKTOP_PX ? "desktop" : "mobile",
      });
      acumuladoMs = 0;
    };

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        enviarPermanencia();
        return;
      }
      inicioVisivel ??= Date.now();
    };

    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("pagehide", enviarPermanencia);
    return () => {
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("pagehide", enviarPermanencia);
    };
  }, []);

  return null;
}
