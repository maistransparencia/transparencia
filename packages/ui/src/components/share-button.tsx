"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

export interface ShareButtonProps {
  variant?: "sidebar" | "compact";
  className?: string;
  onShare?: (payload: { method: "native" | "clipboard"; url: string }) => void;
  title?: string;
  url?: string;
}

export function ShareButton({
  variant = "sidebar",
  className,
  onShare,
  title,
  url,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSharingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerCopyFeedback = (targetUrl: string) => {
    setCopied(true);
    onShare?.({ method: "clipboard", url: targetUrl });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2500);
  };

  const handleShare = async () => {
    if (typeof window === "undefined" || isSharingRef.current) return;
    isSharingRef.current = true;

    try {
      const targetUrl = url
        ? new URL(url, window.location.href).href
        : window.location.href;
      const targetTitle =
        title ??
        (typeof document !== "undefined" && document.title
          ? document.title
          : "MaisTransparencia");

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        try {
          await navigator.share({
            title: targetTitle,
            url: targetUrl,
          });
          onShare?.({ method: "native", url: targetUrl });
          return;
        } catch (err: unknown) {
          if (
            err instanceof Error &&
            (err.name === "AbortError" || err.name === "InvalidStateError")
          ) {
            return;
          }
        }
      }

      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(targetUrl);
          triggerCopyFeedback(targetUrl);
          return;
        }
      } catch {}

      try {
        if (typeof document !== "undefined") {
          const textArea = document.createElement("textarea");
          textArea.value = targetUrl;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          try {
            textArea.select();
            const successful = document.execCommand("copy");
            if (successful) {
              triggerCopyFeedback(targetUrl);
            }
          } finally {
            if (textArea.parentNode) {
              textArea.parentNode.removeChild(textArea);
            }
          }
        }
      } catch {}
    } finally {
      isSharingRef.current = false;
    }
  };

  if (variant === "compact") {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleShare}
          className={cn(
            "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-page text-mute2 transition-colors hover:text-ink active:scale-95",
            copied && "border-ok-text text-ok-text",
            className,
          )}
          aria-label={
            copied
              ? "Link copiado para a área de transferência"
              : "Compartilhar página"
          }
          title={copied ? "Link copiado!" : "Compartilhar página"}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-ok-text" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
        </button>
        {copied && (
          <span
            role="status"
            className="fade-in zoom-in-95 pointer-events-none absolute right-0 bottom-full z-50 mb-1.5 animate-in whitespace-nowrap rounded-md bg-ink px-2 py-0.5 font-medium text-[11px] text-onink shadow-md"
          >
            Link copiado!
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-md border border-line bg-page px-3 py-2.5 font-medium text-ink text-xs transition-colors hover:border-mute3 active:scale-[0.99]",
        copied && "border-ok-text text-ok-text hover:text-ok-text",
        className,
      )}
      aria-label={
        copied
          ? "Link copiado para a área de transferência"
          : "Compartilhar página atual"
      }
      title="Compartilhar link desta página"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 shrink-0 text-ok-text" />
          <span
            role="status"
            aria-live="polite"
            className="font-semibold text-ok-text"
          >
            Link copiado!
          </span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5 shrink-0 text-mute2" />
          <span>Compartilhar página</span>
        </>
      )}
    </button>
  );
}
