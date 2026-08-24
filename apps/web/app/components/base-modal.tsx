"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidthClass = "max-w-md",
}: BaseModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar modal"
        className="fixed inset-0 border-none bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Container do Modal */}
      <div
        className={`relative z-[10001] w-full ${maxWidthClass} rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fechar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {(title || icon) && (
          <div className="flex items-center gap-3 pr-6">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-700 shadow-xs">
                {icon}
              </div>
            )}
            <div>
              {title && typeof title === "string" ? (
                <h2 className="font-bold text-base text-slate-900">{title}</h2>
              ) : (
                title
              )}
              {subtitle && typeof subtitle === "string" ? (
                <p className="text-slate-500 text-xs">{subtitle}</p>
              ) : (
                subtitle
              )}
            </div>
          </div>
        )}

        <div className={title || icon ? "mt-5" : ""}>{children}</div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
