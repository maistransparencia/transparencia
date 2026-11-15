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
          "text-mute text-left text-xs leading-relaxed font-normal",
          className,
        )}
      >
        <span className="leading-relaxed text-inherit">{text}</span>
        {secondaryText && (
          <p
            className="text-mute3 line-clamp-1 pt-0.5 text-[11px] italic"
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
          "text-mute text-left text-xs leading-relaxed font-normal",
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
          className="leading-relaxed text-inherit"
        >
          {text}
        </p>
        {secondaryText && (
          <p
            className="text-mute3 line-clamp-1 pt-0.5 text-[11px] italic"
            title={secondaryText}
          >
            {secondaryText}
          </p>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-brand-text focus:ring-focus-ring mt-0.5 inline-flex items-center gap-1 rounded-xs text-[11px] font-semibold transition-colors hover:underline hover:opacity-80 focus:ring-2 focus:outline-hidden"
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
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium shadow-2xs transition-colors",
                copied
                  ? "border-ok-fill bg-ok-fill/15 text-ok-text border"
                  : "border-line bg-page text-mute hover:bg-line2 active:bg-track border",
              )}
            >
              {copied ? (
                <>
                  <Check className="text-ok-text h-4 w-4" aria-hidden="true" />
                  <span className="font-semibold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="text-mute2 h-4 w-4" aria-hidden="true" />
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
                  className="border-brand-fill bg-brand-fill/15 text-brand-text hover:bg-brand-fill/25 active:bg-brand-fill/30 inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors"
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
                className="border-line bg-page text-mute hover:bg-line2 active:bg-track rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        }
      >
        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-2">
          {secondaryText && (
            <div className="border-line/60 bg-line2 text-mute rounded-md border p-2.5 text-xs">
              {secondaryText}
            </div>
          )}
          <p className="text-ink font-sans text-sm leading-relaxed whitespace-pre-wrap select-text">
            {text}
          </p>
        </div>
      </ModalDialog>
    </>
  );
}
