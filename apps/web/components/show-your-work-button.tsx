"use client";

import {
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
} from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

export interface ShowYourWorkButtonProps {
  portalSlug?: string;
  ano: number;
  tipo: "gasto_sensivel" | "opacidade_99" | "funcao";
  categoria?: string;
  funcaoCodigo?: string;
  entidades?: string;
  tituloContexto?: string;
  className?: string;
}

export function ShowYourWorkButton({
  portalSlug,
  ano,
  tipo,
  categoria,
  funcaoCodigo,
  entidades,
  tituloContexto,
  className = "",
}: ShowYourWorkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setErrorMessage(null);

    const slug = portalSlug || "porciuncula_prefeitura";
    const telemetryPayload = {
      portal_slug: slug,
      tipo,
      ano,
      categoria: categoria ?? null,
      funcao_codigo: funcaoCodigo ?? null,
      entidades: entidades ?? null,
    };

    posthog.capture("show_your_work_download_clicked", telemetryPayload);

    const searchParams = new URLSearchParams();
    searchParams.set("tipo", tipo);
    searchParams.set("ano", String(ano));
    if (categoria) searchParams.set("categoria", categoria);
    if (funcaoCodigo) searchParams.set("funcaoCodigo", funcaoCodigo);
    if (entidades) searchParams.set("entidades", entidades);

    const exportUrl = `/api/${slug}/export?${searchParams.toString()}`;

    try {
      const res = await fetch(exportUrl);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message =
          errorData?.error || "Erro ao processar o download dos registros.";
        setErrorMessage(message);
        posthog.capture("show_your_work_download_failed", {
          ...telemetryPayload,
          status: res.status,
          error: message,
        });
        return;
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/);
      const filename = filenameMatch?.[1] || `despesas_${tipo}_${ano}.csv`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      posthog.capture("show_your_work_download_completed", {
        ...telemetryPayload,
        filename,
      });

      setIsOpen(false);
    } catch {
      setErrorMessage("Falha de conexão ao baixar o arquivo CSV.");
      posthog.capture("show_your_work_download_failed", {
        ...telemetryPayload,
        error: "network_error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Botão sutil de 3 pontos (Menu) */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setErrorMessage(null);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
        aria-label="Opções de auditoria"
        title="Opções de auditoria (Show Your Work)"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Menu Dropdown Suspenso */}
      {isOpen && (
        <div
          className="absolute top-full right-0 z-40 mt-1.5 min-w-[240px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
          role="menu"
        >
          <div className="mb-1 border-slate-100 border-b px-2 pb-1.5">
            <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
              Auditoria Cívica
            </span>
            {tituloContexto && (
              <p className="truncate font-medium text-slate-700 text-xs">
                {tituloContexto}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            role="menuitem"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <div className="flex flex-col">
              <span className="font-medium text-slate-800 text-xs">
                {isDownloading
                  ? "Gerando planilha..."
                  : "Baixar registros (CSV)"}
              </span>
              <span className="text-[10px] text-slate-400">
                Planilha empenho a empenho
              </span>
            </div>
          </button>

          {errorMessage && (
            <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-rose-100 bg-rose-50 p-2 text-rose-700 text-xs">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
