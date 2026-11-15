"use client";

import { cn } from "@transparencia/ui";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LicitacoesSpotlightModal } from "./licitacoes-spotlight-modal";

export interface LicitacoesSearchBarProps {
  portalSlug: string;
  ano?: number;
  /** Abre a busca já preenchida (parâmetro `q` da URL). */
  termoInicial?: string;
  className?: string;
}

export function LicitacoesSearchBar({
  portalSlug,
  ano,
  termoInicial,
  className,
}: LicitacoesSearchBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(Boolean(termoInicial));
  const [termoAplicado, setTermoAplicado] = useState(termoInicial);
  const [isMac, setIsMac] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Se não estiver intersectando e o topo for menor que 0, rolou para além da barra
        const passed =
          !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setIsScrolledPast(passed);
      },
      {
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showFloatingPill = isScrolledPast && !isModalOpen;

  return (
    <>
      <div ref={containerRef} className={cn("relative w-full", className)}>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          aria-label="Abrir busca global de licitações e contratos (Atalho: Command K)"
          className="group border-line bg-page hover:border-mute3 flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-all sm:px-5 sm:py-3.5"
        >
          <div className="text-mute3 group-hover:text-mute2 flex items-center gap-3">
            <Search className="text-mute3 group-hover:text-ink h-5 w-5 shrink-0 transition-colors" />
            <span className="text-mute2 text-xs sm:text-sm">
              Buscar por objeto, número do processo (ex: 0043/24) ou
              fornecedor...
            </span>
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <kbd className="border-line bg-line2 text-mute2 inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </div>
        </button>
      </div>

      {/* Pílula flutuante no mobile quando o scroll ultrapassa o campo de busca */}
      <div
        aria-hidden={!showFloatingPill}
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] left-1/2 z-30 -translate-x-1/2 transition-all duration-300 ease-out md:hidden",
          showFloatingPill
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <button
          type="button"
          tabIndex={showFloatingPill ? 0 : -1}
          onClick={() => setIsModalOpen(true)}
          aria-label="Abrir busca rápida de licitações e contratos"
          className="border-line bg-page/95 flex items-center gap-2 rounded-full border px-4 py-2.5 shadow-lg backdrop-blur-md transition-transform active:scale-95"
        >
          <Search className="text-brand h-4 w-4 shrink-0" />
          <span className="text-ink text-xs font-medium whitespace-nowrap">
            Buscar licitações e contratos
          </span>
          <span className="bg-line2 text-brand rounded-full px-2 py-0.5 text-[10px] font-semibold">
            Buscar
          </span>
        </button>
      </div>

      {isModalOpen && (
        <LicitacoesSpotlightModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setTermoAplicado(undefined);
            const url = new URL(window.location.href);
            if (url.searchParams.has("q")) {
              url.searchParams.delete("q");
              window.history.replaceState(null, "", url);
            }
          }}
          portalSlug={portalSlug}
          ano={ano}
          termoInicial={termoAplicado}
        />
      )}
    </>
  );
}
