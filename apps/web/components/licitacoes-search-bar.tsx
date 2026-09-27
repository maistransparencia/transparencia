"use client";

import { cn } from "@transparencia/ui";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LicitacoesSpotlightModal } from "./licitacoes-spotlight-modal";

export interface LicitacoesSearchBarProps {
  portalSlug: string;
  ano?: number;
  className?: string;
}

export function LicitacoesSearchBar({
  portalSlug,
  ano,
  className,
}: LicitacoesSearchBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
          className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-xs transition-all hover:border-accent/40 hover:shadow-md sm:px-5 sm:py-3.5"
        >
          <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600">
            <Search className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-accent" />
            <span className="text-slate-500 text-xs sm:text-sm">
              Buscar por objeto, número do processo (ex: 0043/24) ou
              fornecedor...
            </span>
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <kbd className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-medium font-mono text-[11px] text-slate-500 shadow-2xs group-hover:border-slate-300">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </div>
        </button>
      </div>

      {/* Pílula flutuante no mobile quando o scroll ultrapassa o campo de busca */}
      <div
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] left-1/2 z-30 -translate-x-1/2 transition-all duration-300 ease-out md:hidden",
          showFloatingPill
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          aria-label="Abrir busca rápida de licitações e contratos"
          className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-4 py-2.5 shadow-lg shadow-slate-900/10 backdrop-blur-md transition-transform active:scale-95"
        >
          <Search className="h-4 w-4 shrink-0 text-accent" />
          <span className="whitespace-nowrap font-medium text-slate-700 text-xs">
            Buscar licitações e contratos
          </span>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-[10px] text-accent">
            Buscar
          </span>
        </button>
      </div>

      {isModalOpen && (
        <LicitacoesSpotlightModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          portalSlug={portalSlug}
          ano={ano}
        />
      )}
    </>
  );
}
