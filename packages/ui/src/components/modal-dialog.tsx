"use client";

import { ArrowLeft, X } from "lucide-react";
import type React from "react";
import { useEffect, useId, useRef } from "react";
import { cn } from "../utils/cn";

export interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "full";
  className?: string;
  ariaLabel?: string;
  zIndex?: string;
}

const MAX_WIDTH_MAP: Record<
  NonNullable<ModalDialogProps["maxWidth"]>,
  string
> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  "6xl": "sm:max-w-6xl",
  full: "sm:max-w-[95vw]",
};

export function ModalDialog({
  isOpen,
  onClose,
  onBack,
  backLabel,
  title,
  subtitle,
  badge,
  children,
  footer,
  maxWidth = "2xl",
  className,
  ariaLabel,
  zIndex,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current =
      document.activeElement as HTMLElement | null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus inicial no container do diálogo ou primeiro elemento interativo
    const focusTimer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length > 0) {
          focusable[0]?.focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (el) => el.offsetParent !== null || el === document.activeElement,
        );

        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (
            document.activeElement === first ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            event.preventDefault();
            last?.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            event.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElementRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || MAX_WIDTH_MAP["2xl"];

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4",
        zIndex ?? "z-50",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="Fechar ao clicar fora"
        className="fixed inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[85vh] w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-200",
          "self-end rounded-t-2xl",
          "sm:self-center sm:rounded-xl",
          maxWidthClass,
          className,
        )}
      >
        {/* Header Estruturado */}
        <div className="flex items-start justify-between border-slate-200/80 border-b bg-slate-50/90 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1 pr-3">
            {onBack && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 text-xs shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{backLabel ?? "Voltar"}</span>
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={titleId}
                className="font-bold font-serif text-base text-slate-900 sm:text-lg"
              >
                {title}
              </h2>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="mt-0.5 line-clamp-1 text-slate-500 text-xs sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 active:bg-slate-300"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Corpo do Diálogo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {/* Rodapé Opcional */}
        {footer && (
          <div className="border-slate-200/80 border-t bg-slate-50/70 px-5 py-3 sm:px-6 sm:py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
