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
          className="group flex w-full items-center justify-between gap-3 rounded-md border border-line bg-page px-4 py-3 text-left transition-all hover:border-mute3 sm:px-5 sm:py-3.5"
        >
          <div className="flex items-center gap-3 text-mute3 group-hover:text-mute2">
            <Search className="h-5 w-5 shrink-0 text-mute3 transition-colors group-hover:text-ink" />
            <span className="text-mute2 text-xs sm:text-sm">
              Buscar por objeto, número do processo (ex: 0043/24) ou
              fornecedor...
            </span>
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <kbd className="inline-flex items-center rounded-md border border-line bg-line2 px-2 py-1 font-medium text-[11px] text-mute2 group-hover:border-line">
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
