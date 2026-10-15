"use client";

import { BProgress } from "@bprogress/core";
import { useProgress } from "@bprogress/next";
import { ProgressProvider as BProgressProvider } from "@bprogress/next/app";
import { usePathname, useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useCallback, useEffect, useRef } from "react";

function RouteChangeListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { disableAutoStop } = useProgress();
  const isInitialMount = useRef(true);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearFallbackTimeout = useCallback(() => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  const startWithFallbackTimeout = useCallback(() => {
    clearFallbackTimeout();
    BProgress.start();
    fallbackTimeoutRef.current = setTimeout(() => {
      BProgress.done();
      fallbackTimeoutRef.current = null;
    }, 8000);
  }, [clearFallbackTimeout]);

  // Desativa a parada automática prematura no pushState para que transições
  // do App Router do Next.js continuem visíveis até a página carregar por completo.
  useEffect(() => {
    disableAutoStop();
  }, [disableAutoStop]);

  // Sempre que pathname ou searchParams mudarem, a transição concluiu.
  useEffect(() => {
    void pathname;
    void searchParams;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    clearFallbackTimeout();
    BProgress.done();
  }, [pathname, searchParams, clearFallbackTimeout]);

  // Recuperação contra erros não tratados durante navegação
  useEffect(() => {
    const handleNavigationError = () => {
      clearFallbackTimeout();
      BProgress.done();
    };

    window.addEventListener("error", handleNavigationError);
    window.addEventListener("unhandledrejection", handleNavigationError);
    return () => {
      clearFallbackTimeout();
      window.removeEventListener("error", handleNavigationError);
      window.removeEventListener("unhandledrejection", handleNavigationError);
    };
  }, [clearFallbackTimeout]);

  // Escuta cliques em links internos na fase padrão (bubble), respeitando event.defaultPrevented
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;

      if (
        anchor.hasAttribute("download") ||
        anchor.getAttribute("data-disable-progress") === "true" ||
        anchor.getAttribute("data-prevent-progress") === "true" ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("javascript:") ||
        rawHref.startsWith("blob:") ||
        rawHref.startsWith("data:") ||
        rawHref.startsWith("/api/") ||
        /\.(pdf|csv|xlsx|xls|zip|gz|tar|xml|json)(\?.*)?$/i.test(rawHref)
      ) {
        return;
      }

      try {
        const targetUrl = new URL(rawHref, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (targetUrl.origin !== currentUrl.origin) return;

        // Ignora navegação exclusivamente por âncora/hash no mesmo pathname e search
        if (
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return;
        }

        startWithFallbackTimeout();
      } catch {
        // Fallback para URLs que não puderem ser parseadas
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [startWithFallbackTimeout]);

  return null;
}

export interface ProgressProviderProps {
  children: React.ReactNode;
}

export function ProgressProvider({ children }: ProgressProviderProps) {
  return (
    <BProgressProvider
      height="3px"
      color="oklch(0.55 0.11 250)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      <Suspense fallback={null}>
        <RouteChangeListener />
      </Suspense>
      {children}
    </BProgressProvider>
  );
}
