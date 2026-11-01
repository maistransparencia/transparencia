"use client";

import { AlertCircle, Bell, BellRing } from "lucide-react";
import { useId, useState } from "react";
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
  const [areStepsOpen, setAreStepsOpen] = useState(false);
  const stepsId = useId();

  // Não suportado pelo navegador
  if (!isSupported) {
    return null;
  }

  // Um único caminho para ativar e desativar; falhas viram mensagem no hook
  const runAction = async (
    action: () => Promise<boolean>,
    onSuccess?: () => void,
  ) => {
    setIsActionLoading(true);
    try {
      const success = await action();
      if (success) {
        onSuccess?.();
      }
    } catch {
      // O hook já registra a mensagem de erro; nada a propagar.
    } finally {
      setIsActionLoading(false);
    }
  };

  const errorMessage = error && (
    <p className="text-danger-text text-xs leading-tight" role="alert">
      {error}
    </p>
  );

  // Bloqueado no nível do navegador
  if (permission === "denied") {
    return (
      <div className="space-y-1">
        <p className={`${linhaStatusClass} font-medium text-ink`}>
          <AlertCircle
            className="h-4 w-4 shrink-0 text-warn-text"
            aria-hidden="true"
          />
          Notificações bloqueadas
        </p>
        <button
          type="button"
          aria-expanded={areStepsOpen}
          aria-controls={stepsId}
          onClick={() => setAreStepsOpen((previous) => !previous)}
          className="min-h-11 cursor-pointer text-mute2 text-xs underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 sm:min-h-0"
        >
          Como desbloquear
        </button>
        <div id={stepsId} hidden={!areStepsOpen}>
          <ol className="list-decimal space-y-1 pl-4 text-mute2 text-xs leading-relaxed">
            <li>Toque ou clique no ícone de cadeado na barra de endereços.</li>
            <li>Abra as configurações do site.</li>
            <li>Em Notificações, mude a permissão para Permitir.</li>
            <li>Volte a esta página e recarregue.</li>
          </ol>
        </div>
        {errorMessage}
      </div>
    );
  }

  const isBusy = isLoading || isActionLoading;

  // Estado real ainda desconhecido: sem rótulo de ativas/desativadas
  if (isLoading && !isActionLoading) {
    return (
      <div className="space-y-2">
        <p className={`${linhaStatusClass} text-mute2`}>
          <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
          Carregando…
        </p>
        {errorMessage}
      </div>
    );
  }

  // Inscrito / ativo
  if (isSubscribed) {
    return (
      <div className="space-y-2">
        <p role="status" className={`${linhaStatusClass} font-medium text-ink`}>
          <BellRing
            className="h-4 w-4 shrink-0 text-ok-text"
            aria-hidden="true"
          />
          Notificações ativas
        </p>
        <button
          type="button"
          onClick={() => runAction(unsubscribe)}
          disabled={isBusy}
          className={`${botaoSecundario} w-full`}
        >
          {isActionLoading ? "Aguarde..." : "Desativar"}
        </button>
        {errorMessage}
      </div>
    );
  }

  // Não inscrito / disponível
  return (
    <div className="space-y-2">
      <p role="status" className={`${linhaStatusClass} font-medium text-ink`}>
        <Bell className="h-4 w-4 shrink-0 text-mute2" aria-hidden="true" />
        Notificações desativadas
      </p>
      <button
        type="button"
        onClick={() => runAction(subscribe, onSubscribeSuccess)}
        disabled={isBusy}
        className={`${botaoSecundario} w-full`}
      >
        {isActionLoading ? "Ativando..." : "Ativar"}
      </button>
      {errorMessage}
    </div>
  );
}
