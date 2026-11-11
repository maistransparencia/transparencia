"use client";

import {
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
} from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ShowYourWorkButtonProps {
  portalSlug: string;
  /** Obrigatório para todos os tipos, exceto `estoque_farmacia`. */
  ano?: number;
  tipo:
    | "gasto_sensivel"
    | "opacidade_99"
    | "funcao"
    | "saldo_caixa_siconfi"
    | "pessoal_regime"
    | "estoque_farmacia";
  /** `menu` (padrão): três pontos com menu; `link`: botão de download direto com rótulo e legenda. */
  variante?: "menu" | "link";
  rotulo?: string;
  legenda?: string;
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
  variante = "menu",
  rotulo,
  legenda,
  categoria,
  funcaoCodigo,
  entidades,
  tituloContexto,
  className = "",
}: ShowYourWorkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [posicaoMenu, setPosicaoMenu] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const alvo = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(alvo) &&
        !menuRef.current?.contains(alvo)
      ) {
        setIsOpen(false);
      }
    }

    // O menu é fixo em relação à janela; fechar ao rolar/redimensionar evita que fique solto.
    function fecharMenu() {
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", fecharMenu);
    window.addEventListener("scroll", fecharMenu, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", fecharMenu);
      window.removeEventListener("scroll", fecharMenu, true);
    };
  }, [isOpen]);

  // Portal + posição fixa: contêineres com overflow (ex.: DenseTable) não cortam o menu.
  useLayoutEffect(() => {
    if (!isOpen || !botaoRef.current) {
      setPosicaoMenu(null);
      return;
    }
    const botao = botaoRef.current.getBoundingClientRect();
    const alturaMenu = menuRef.current?.offsetHeight ?? 0;
    const cabeAbaixo = botao.bottom + 6 + alturaMenu <= window.innerHeight;
    setPosicaoMenu({
      top: cabeAbaixo
        ? botao.bottom + 6
        : Math.max(8, botao.top - 6 - alturaMenu),
      right: Math.max(8, window.innerWidth - botao.right),
    });
  }, [isOpen]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setErrorMessage(null);

    const slug = portalSlug;
    const telemetryPayload = {
      portal_slug: slug,
      tipo,
      ano: ano ?? null,
      categoria: categoria ?? null,
      funcao_codigo: funcaoCodigo ?? null,
      entidades: entidades ?? null,
    };

    posthog.capture("show_your_work_download_clicked", telemetryPayload);

    const searchParams = new URLSearchParams();
    searchParams.set("tipo", tipo);
    if (ano !== undefined) searchParams.set("ano", String(ano));
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
        if (isMountedRef.current) {
          setErrorMessage(message);
        }
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
      const defaultFilename = (() => {
        if (tipo === "estoque_farmacia") return `estoque_farmacia_${slug}.csv`;
        if (tipo === "saldo_caixa_siconfi")
          return `saldo_caixa_siconfi_${ano}.csv`;
        return `despesas_${tipo}_${ano}.csv`;
      })();
      const filename = filenameMatch?.[1] || defaultFilename;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      posthog.capture("show_your_work_download_completed", {
        ...telemetryPayload,
        filename,
      });

      if (isMountedRef.current) {
        setIsOpen(false);
      }
    } catch {
      if (isMountedRef.current) {
        setErrorMessage("Falha de conexão ao baixar o arquivo CSV.");
      }
      posthog.capture("show_your_work_download_failed", {
        ...telemetryPayload,
        error: "network_error",
      });
    } finally {
      if (isMountedRef.current) {
        setIsDownloading(false);
      }
    }
  };

  if (variante === "link") {
    return (
      <div className={`flex flex-col items-start gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-left text-sm underline focus:outline-none focus:ring-2 focus:ring-line disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDownloading ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {isDownloading ? "Gerando planilha..." : rotulo}
        </button>
        {legenda && (
          <p className="text-mute text-sm leading-relaxed">{legenda}</p>
        )}
        {errorMessage && (
          <p role="alert" className="text-danger-text text-sm">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Botão sutil de 3 pontos (Menu) */}
      <button
        ref={botaoRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setErrorMessage(null);
        }}
        className="flex size-7 min-h-7 min-w-7 cursor-pointer items-center justify-center rounded-lg text-mute3 transition-colors hover:bg-line2 hover:text-mute focus:outline-none focus:ring-2 focus:ring-line"
        aria-label="Opções de auditoria"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Opções de auditoria (Show Your Work)"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Menu Dropdown Suspenso */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 min-w-60 rounded-lg border border-line bg-page p-2 shadow-lg"
            style={{
              top: posicaoMenu?.top ?? 0,
              right: posicaoMenu?.right ?? 0,
              visibility: posicaoMenu ? "visible" : "hidden",
            }}
            role="menu"
          >
            <div className="mb-1 border-line2 border-b px-2 pb-1.5">
              <span className="font-semibold text-[10px] text-mute3 uppercase tracking-wider">
                Auditoria Cívica
              </span>
              {tituloContexto && (
                <p className="truncate font-medium text-mute text-xs">
                  {tituloContexto}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-line2 focus:bg-line2 disabled:cursor-not-allowed disabled:opacity-60"
              role="menuitem"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-text" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-ok-text" />
              )}
              <div className="flex flex-col">
                <span className="font-medium text-ink text-xs">
                  {isDownloading
                    ? "Gerando planilha..."
                    : "Baixar registros (CSV)"}
                </span>
                <span className="text-[10px] text-mute3">
                  Planilha empenho a empenho
                </span>
              </div>
            </button>

            {errorMessage && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-danger-fill/30 bg-danger-fill/10 p-2 text-danger-text text-xs">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
