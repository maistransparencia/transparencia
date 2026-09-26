"use client";

import posthog from "posthog-js";
import { useEffect, useState } from "react";

interface ExtractionNotificationBannerProps {
  lastExtractionDate?: string;
  portalName?: string;
  portalSlug?: string;
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
}: ExtractionNotificationBannerProps) {
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  useEffect(() => {
    if (!lastExtractionDate || typeof window === "undefined") return;

    const storedExtractionDate = safeGetLocalStorage("last_seen_extraction");

    // No primeiro acesso (quando o usuário nunca viu o portal antes),
    // salva silenciosamente a data atual sem poluir a tela com aviso de "novos dados"
    if (!storedExtractionDate) {
      safeSetLocalStorage("last_seen_extraction", lastExtractionDate);
      return;
    }

    // Em visitas futuras, se a data de extração for diferente da última registrada, exibe o aviso
    if (storedExtractionDate !== lastExtractionDate) {
      setShowNotificationBanner(true);

      posthog.capture("extraction_banner_viewed", {
        last_extraction_date: lastExtractionDate,
        portal_name: portalName,
      });

      const formattedDate = formatDateBR(lastExtractionDate);

      // Dispara notificação nativa com segurança via Service Worker se a permissão já estiver concedida
      if ("Notification" in window && Notification.permission === "granted") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification("Novos Dados Fiscais Publicados", {
                body: `Novos dados de contas públicas foram carregados para ${portalName}. Data de extração: ${formattedDate}`,
                icon: "/favicon-192.png",
                badge: "/favicon-192.png",
                data: { url: "/" },
              });
            })
            .catch(() => {
              // Service worker ready fallback
            });
        }
      }
    }
  }, [lastExtractionDate, portalName]);

  const handleDismiss = () => {
    posthog.capture("extraction_banner_dismissed", {
      last_extraction_date: lastExtractionDate,
      portal_name: portalName,
    });
    if (lastExtractionDate) {
      safeSetLocalStorage("last_seen_extraction", lastExtractionDate);
    }
    setShowNotificationBanner(false);
  };

  if (!showNotificationBanner) return null;

  const formattedDate = formatDateBR(lastExtractionDate);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-blue-200 border-b bg-blue-50 px-4 py-2 text-blue-950 text-xs shadow-xs sm:text-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden="true">📢</span>
        <span>
          <strong>Novos dados disponíveis!</strong> A última extração de contas
          públicas de{" "}
          <span className="font-semibold text-blue-700">{portalName}</span> foi
          atualizada ({formattedDate}).
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-auto shrink-0 rounded px-2.5 py-1 font-semibold text-blue-700 text-xs transition-colors hover:bg-blue-100"
      >
        Entendido
      </button>
    </div>
  );
}
