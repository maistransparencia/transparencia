"use client";

import { AlertCircle, Bell, BellRing } from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export interface PushNotificationSettingsProps {
  portalSlug?: string;
  onSubscribeSuccess?: () => void;
}

export function PushNotificationSettings({
  portalSlug = "porciuncula_prefeitura",
  onSubscribeSuccess,
}: PushNotificationSettingsProps) {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications({ portalSlug });

  const [isActionLoading, setIsActionLoading] = useState(false);

  return (() => {
    // Estado 4: Não suportado pelo navegador
    if (!isSupported) {
      return null;
    }

    // Estado 3: Bloqueado no nível do navegador
    if (permission === "denied") {
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-amber-900 text-xs shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle
              className="h-4 w-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <span className="font-medium">Notificações bloqueadas</span>
          </div>
          <span
            className="cursor-help font-medium text-[11px] text-amber-700 underline decoration-dotted"
            title="Para reativar, clique no ícone de cadeado na barra de endereços do seu navegador e altere a permissão para Notificações."
          >
            Desbloquear
          </span>
        </div>
      );
    }

    // Estado 1: Inscrito / Ativo
    if (isSubscribed) {
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-emerald-950 text-xs shadow-xs"
        >
          <div className="flex items-center gap-2">
            <BellRing
              className="h-3.5 w-3.5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <span className="font-semibold text-emerald-900">
              Notificações ativas
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsActionLoading(true);
              try {
                await unsubscribe();
              } finally {
                setIsActionLoading(false);
              }
            }}
            disabled={isLoading || isActionLoading}
            className="cursor-pointer font-semibold text-emerald-700 text-xs transition-colors hover:text-emerald-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isActionLoading ? "Aguarde..." : "Desativar"}
          </button>
        </div>
      );
    }

    // Estado 2: Não inscrito / Disponível (AC 4: Exibe status 'Notificações desativadas' com botão para ativar)
    return (
      <div className="space-y-1">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-2 rounded-lg border border-borderLine bg-white px-3 py-2 text-xs shadow-xs"
        >
          <div className="flex items-center gap-2 text-slate-600">
            <Bell
              className="h-3.5 w-3.5 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <span className="font-medium text-slate-700">
              Notificações desativadas
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsActionLoading(true);
              try {
                const success = await subscribe();
                if (success && onSubscribeSuccess) {
                  onSubscribeSuccess();
                }
              } finally {
                setIsActionLoading(false);
              }
            }}
            disabled={isLoading || isActionLoading}
            className="cursor-pointer font-semibold text-blue-600 text-xs transition-colors hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isActionLoading ? "Ativando..." : "Ativar"}
          </button>
        </div>
        {error && (
          <p className="px-1 text-[11px] text-red-600 leading-tight">{error}</p>
        )}
      </div>
    );
  })();
}
