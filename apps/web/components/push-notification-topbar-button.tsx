"use client";

import { Bell, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export interface PushNotificationTopbarButtonProps {
  portalSlug?: string;
  onSubscribeSuccess?: () => void;
}

export function PushNotificationTopbarButton({
  portalSlug = "porciuncula_prefeitura",
  onSubscribeSuccess,
}: PushNotificationTopbarButtonProps) {
  const { isSupported, isSubscribed, permission, isLoading, subscribe } =
    usePushNotifications({ portalSlug });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Oculta se o navegador não suportar, se já estiver inscrito ou se a permissão foi negada
  if (!isSupported || isSubscribed || permission === "denied") {
    return null;
  }

  const handleSubscribe = async () => {
    setIsActionLoading(true);
    try {
      posthog.capture("push_topbar_button_clicked", {
        portal_slug: portalSlug,
      });

      const success = await subscribe();
      if (success && onSubscribeSuccess) {
        onSubscribeSuccess();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const isBusy = isLoading || isActionLoading;

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={isBusy}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/90 px-2.5 py-1 font-medium text-blue-700 text-xs shadow-2xs transition-colors hover:bg-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Ativar notificações push de contas públicas"
      title="Ativar notificações de contas públicas"
    >
      {isActionLoading ? (
        <Loader2
          className="h-3.5 w-3.5 animate-spin text-blue-600"
          aria-hidden="true"
        />
      ) : (
        <Bell className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
      )}
      <span className="font-semibold text-[11px]">Ativar avisos</span>
    </button>
  );
}
