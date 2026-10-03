"use client";

import { type PortalOption, resolvePortalSlug } from "@transparencia/ui";
import { Megaphone } from "lucide-react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

interface ExtractionNotificationBannerProps {
  lastExtractionDate?: string;
  portalName?: string;
  portalSlug?: string;
  portais?: PortalOption[];
}

function safeGetLocalStorage(key: string): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return "";

  const cleanDate = dateStr.split("T")[0];
  const parts = cleanDate.split("-");

  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year.length === 4 && month.length === 2 && day.length === 2) {
      return `${day}/${month}/${year}`;
    }
  }

  try {
    const dateObj = new Date(dateStr);
    if (!Number.isNaN(dateObj.getTime())) {
      return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        dateObj,
      );
    }
  } catch {
    // fallback to original string if parsing fails
  }

  return dateStr;
}

export function ExtractionNotificationBanner({
  lastExtractionDate,
  portalName = "Prefeitura de Porciúncula",
  portalSlug = "porciuncula_prefeitura",
  portais,
}: ExtractionNotificationBannerProps) {
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const pathname = usePathname();

  const segments = (pathname || "").split("/").filter(Boolean);
  const activePortal = (() => {
    if (segments.length > 0) {
      const first = segments[0];
      return portais?.find(
        (p) =>
          p.portalSlug === first || p.portalSlug === resolvePortalSlug(first),
      );
    }
    return undefined;
  })();

  const effectivePortalName = activePortal?.displayName || portalName;
  const effectivePortalSlug = activePortal?.portalSlug || portalSlug;
  const effectiveExtractionDate =
    activePortal?.dataExtracao || lastExtractionDate;

  const storageKey =
    effectivePortalSlug && effectivePortalSlug !== "porciuncula_prefeitura"
      ? `last_seen_extraction_${effectivePortalSlug}`
      : "last_seen_extraction";

  useEffect(() => {
    if (!effectiveExtractionDate || typeof window === "undefined") return;

    const storedExtractionDate = safeGetLocalStorage(storageKey);

    if (!storedExtractionDate) {
      safeSetLocalStorage(storageKey, effectiveExtractionDate);
      return;
    }

    if (storedExtractionDate !== effectiveExtractionDate) {
      setShowNotificationBanner(true);

      posthog.capture("extraction_banner_viewed", {
        last_extraction_date: effectiveExtractionDate,
        portal_name: effectivePortalName,
      });

      const formattedDate = formatDateBR(effectiveExtractionDate);

      if ("Notification" in window && Notification.permission === "granted") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification("Novos Dados Fiscais Publicados", {
                body: `Novos dados de contas públicas foram carregados para ${effectivePortalName}. Data de extração: ${formattedDate}`,
                icon: "/favicon-192.png",
                badge: "/favicon-192.png",
                data: { url: `/${effectivePortalSlug}` },
              });
            })
            .catch(() => {
              // Service worker ready fallback
            });
        }
      }
    }
  }, [
    effectiveExtractionDate,
    effectivePortalName,
    effectivePortalSlug,
    storageKey,
  ]);

  const handleDismiss = () => {
    posthog.capture("extraction_banner_dismissed", {
      last_extraction_date: effectiveExtractionDate,
      portal_name: effectivePortalName,
    });
    if (effectiveExtractionDate) {
      safeSetLocalStorage(storageKey, effectiveExtractionDate);
    }
    setShowNotificationBanner(false);
  };

  if (!showNotificationBanner) return null;

  const formattedDate = formatDateBR(effectiveExtractionDate);

  return (
    <aside
      aria-label="Aviso de novos dados disponíveis"
      className="fixed right-4 bottom-20 left-4 z-50 max-w-md rounded-lg border border-blue-200 bg-blue-50/95 p-3.5 text-blue-950 text-xs shadow-lg backdrop-blur-xs transition-all sm:right-4 sm:bottom-4 sm:left-auto sm:text-sm"
    >
      <div className="flex items-start gap-2.5">
        <Megaphone
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-blue-600"
        />
        <div className="flex-1 space-y-2">
          <p className="leading-snug">
            <strong>Novos dados disponíveis!</strong> A última extração de
            contas públicas de{" "}
            <span className="font-semibold text-blue-700">
              {effectivePortalName}
            </span>{" "}
            foi atualizada ({formattedDate}).
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded bg-blue-600 px-3 py-1 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
