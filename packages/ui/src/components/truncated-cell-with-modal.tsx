"use client";

import { Check, Copy, ExternalLink, Maximize2 } from "lucide-react";
import React, { useState } from "react";
import { cn } from "../utils/cn";
import { ModalDialog } from "./modal-dialog";

export interface TruncatedCellWithModalProps {
  text: string;
  maxLines?: number;
  characterThreshold?: number;
  modalTitle?: string;
  modalSubtitle?: string;
  secondaryText?: string;
  badge?: React.ReactNode;
  externalLink?: { href: string; label?: string };
  externalUrl?: string | null;
  externalLabel?: string;
  className?: string;
}

export function TruncatedCellWithModal({
  text,
  maxLines = 2,
  characterThreshold = 100,
  modalTitle = "Objeto da Contratação",
  modalSubtitle,
  secondaryText,
  badge,
  externalLink,
  externalUrl,
  externalLabel,
  className,
}: TruncatedCellWithModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const effectiveExternalLink =
    externalLink ??
    (externalUrl ? { href: externalUrl, label: externalLabel } : undefined);

  if (!text) {
    return <span className={className}>—</span>;
  }

  const isTruncated = text.length > characterThreshold || text.includes("\n");

  if (!isTruncated) {
    return (
      <div
        className={cn(
          "text-left font-normal text-slate-700 text-xs leading-relaxed",
          className,
        )}
      >
        <span className="text-inherit leading-relaxed">{text}</span>
        {secondaryText && (
          <p
            className="line-clamp-1 pt-0.5 text-[11px] text-slate-400 italic"
            title={secondaryText}
          >
            {secondaryText}
          </p>
        )}
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback silencioso caso clipboard API esteja indisponível
    }
  };

  return (
    <>
      <div
        className={cn(
          "text-left font-normal text-slate-700 text-xs leading-relaxed",
          className,
        )}
      >
        <p
          style={{
            display: "-webkit-box",
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          className="text-inherit leading-relaxed"
        >
          {text}
        </p>
        {secondaryText && (
          <p
            className="line-clamp-1 pt-0.5 text-[11px] text-slate-400 italic"
            title={secondaryText}
          >
            {secondaryText}
          </p>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-0.5 inline-flex items-center gap-1 rounded-xs font-semibold text-[11px] text-blue-600 transition-colors hover:text-blue-800 hover:underline focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
        >
          <Maximize2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Ver mais</span>
        </button>
      </div>

      <ModalDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={modalTitle}
        subtitle={modalSubtitle}
        badge={badge}
        maxWidth="2xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium text-xs shadow-2xs transition-colors",
                copied
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
              )}
            >
              {copied ? (
                <>
                  <Check
                    className="h-4 w-4 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span>Copiar texto completo</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {effectiveExternalLink && (
                <a
                  href={effectiveExternalLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 font-semibold text-blue-700 text-xs transition-colors hover:bg-blue-100 active:bg-blue-200"
                >
                  <span>
                    {effectiveExternalLink.label ||
                      "Acessar no Portal de Origem"}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-medium text-slate-700 text-xs transition-colors hover:bg-slate-50 active:bg-slate-100"
              >
                Fechar
              </button>
            </div>
          </div>
        }
      >
        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-2">
          {secondaryText && (
            <div className="rounded-md border border-slate-200/60 bg-slate-50 p-2.5 text-slate-600 text-xs">
              {secondaryText}
            </div>
          )}
          <p className="select-text whitespace-pre-wrap font-sans text-slate-800 text-sm leading-relaxed">
            {text}
          </p>
        </div>
      </ModalDialog>
    </>
  );
}
