"use client";

import { AlertCircle, Bell, BellRing } from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { botaoSecundario } from "./botoes-acao";

export interface PushNotificationSettingsProps {
  portalSlug: string;
  onSubscribeSuccess?: () => void;
}

const linhaStatusClass = "flex items-center gap-2 text-xs";

export function PushNotificationSettings({
  portalSlug,
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

  // Não suportado pelo navegador
  if (!isSupported) {
    return null;
  }

  // Bloqueado no nível do navegador
  if (permission === "denied") {
    return (
      <div role="status" aria-live="polite" className="space-y-1">
        <p className={`${linhaStatusClass} font-medium text-ink`}>
          <AlertCircle
            className="h-4 w-4 shrink-0 text-warn"
            aria-hidden="true"
          />
          Notificações bloqueadas
        </p>
        <p
          className="cursor-help text-mute2 text-xs underline decoration-dotted"
          title="Para reativar, clique no ícone de cadeado na barra de endereços do seu navegador e altere a permissão para Notificações."
        >
          Desbloquear
        </p>
      </div>
    );
  }

  // Inscrito / ativo
  if (isSubscribed) {
    return (
      <div role="status" aria-live="polite" className="space-y-2">
        <p className={`${linhaStatusClass} font-medium text-ink`}>
          <BellRing className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
          Notificações ativas
        </p>
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
          className={`${botaoSecundario} w-full`}
        >
          {isActionLoading ? "Aguarde..." : "Desativar"}
        </button>
      </div>
    );
  }

  // Não inscrito / disponível
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <p className={`${linhaStatusClass} font-medium text-ink`}>
        <Bell className="h-4 w-4 shrink-0 text-mute2" aria-hidden="true" />
        Notificações desativadas
      </p>
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
        className={`${botaoSecundario} w-full`}
      >
        {isActionLoading ? "Ativando..." : "Ativar"}
      </button>
      {error && (
        <p className="text-danger text-xs leading-tight" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
