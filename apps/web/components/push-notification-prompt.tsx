"use client";

import { Bell, X } from "lucide-react";
import posthog from "posthog-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export interface PushNotificationPromptProps {
  portalSlug?: string;
  cooldownDays?: number;
}

const DEFAULT_COOLDOWN_DAYS = 30;

function getDismissedStorageKey(portalSlug: string): string {
  return `push_prompt_dismissed_at_${portalSlug}`;
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

export function PushNotificationPrompt({
  portalSlug = "porciuncula_prefeitura",
  cooldownDays = DEFAULT_COOLDOWN_DAYS,
}: PushNotificationPromptProps) {
  const { isSupported, isSubscribed, permission, isLoading, subscribe } =
    usePushNotifications({ portalSlug });

  const [isDismissed, setIsDismissed] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const impressionCapturedRef = useRef(false);
  const storageKey = getDismissedStorageKey(portalSlug);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isSupported || isLoading) {
      setIsDismissed(true);
      return;
    }

    // Se já inscrito ou permissão negada/concedida, não exibe
    if (isSubscribed || permission === "denied" || permission === "granted") {
      setIsDismissed(true);
      return;
    }

    const dismissedTimestamp =
      safeGetLocalStorage(storageKey) ??
      safeGetLocalStorage("push_prompt_dismissed_at");
    if (dismissedTimestamp) {
      const dismissedAt = Number(dismissedTimestamp);
      const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < cooldownMs) {
        setIsDismissed(true);
        return;
      }
    }

    setIsDismissed(false);
    if (!impressionCapturedRef.current) {
      impressionCapturedRef.current = true;
      posthog.capture("push_prompt_impression", {
        portal_slug: portalSlug,
      });
    }
  }, [
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    cooldownDays,
    portalSlug,
    storageKey,
  ]);

  const handleDismiss = useCallback(() => {
    safeSetLocalStorage(storageKey, String(Date.now()));
    setIsDismissed(true);
    posthog.capture("push_prompt_dismissed", {
      portal_slug: portalSlug,
    });
  }, [portalSlug, storageKey]);

  const handleAccept = useCallback(async () => {
    setIsSubscribing(true);
    try {
      posthog.capture("push_prompt_accepted", {
        portal_slug: portalSlug,
      });

      const success = await subscribe();
      if (success) {
        setIsDismissed(true);
      } else {
        // Se a permissão foi negada no diálogo nativo ou houve erro, aplica cooldown e fecha o prompt
        safeSetLocalStorage(storageKey, String(Date.now()));
        setIsDismissed(true);
      }
    } finally {
      setIsSubscribing(false);
    }
  }, [subscribe, portalSlug, storageKey]);

  useEffect(() => {
    if (isDismissed) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDismissed, handleDismiss]);

  if (isDismissed) {
    return null;
  }

  return (
    <section
      aria-label="Consentimento de Notificações Cívicas"
      className="fixed right-4 bottom-24 z-50 max-w-md rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-slate-900/5 sm:right-6 md:bottom-6"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">
              Notificações de Contas Públicas
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Fechar aviso de notificações"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-slate-600 text-xs leading-relaxed">
            Acompanhe em tempo real novos gastos, empenhos e liquidações da
            prefeitura com a frequência exigida pelo{" "}
            <a
              href="https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 underline transition-colors hover:text-blue-800"
            >
              Art. 48-A da LC 101/2000 (LRF)
            </a>
            .
          </p>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              type="button"
              onClick={handleAccept}
              disabled={isSubscribing || isLoading}
              className="cursor-pointer rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubscribing ? "Ativando..." : "Ativar Notificações"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 text-xs transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
