"use client";

import { Bell, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export interface PushNotificationTopbarButtonProps {
  portalSlug: string;
  onSubscribeSuccess?: () => void;
}

export function PushNotificationTopbarButton({
  portalSlug,
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
      className="border-brand/30 bg-brand/10 text-brand-text hover:bg-brand/20 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shadow-2xs transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Ativar notificações push de contas públicas"
      title="Ativar notificações de contas públicas"
    >
      {isActionLoading ? (
        <Loader2
          className="text-brand-text h-3 w-3 animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Bell className="text-brand-text h-3 w-3" aria-hidden="true" />
      )}
      <span className="text-[11px] font-semibold">Ativar avisos</span>
    </button>
  );
}
