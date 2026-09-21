"use client";

import { cn } from "@transparencia/ui";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
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

  return (
    <>
      <div className={cn("relative w-full", className)}>
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

          <div className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-medium font-mono text-[11px] text-slate-500 shadow-2xs group-hover:border-slate-300">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </div>
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
