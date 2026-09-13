"use client";

import posthog from "posthog-js";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { env } from "@/env";
import {
  isPushNotificationSupported,
  urlBase64ToUint8Array,
} from "@/lib/vapid";

export interface UsePushNotificationsOptions {
  portalSlug?: string;
}

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | "unsupported";
  isLoading: boolean;
  error: string | null;
  subscribe: (topics?: string[]) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export interface PushStoreState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | "unsupported";
  isLoading: boolean;
  error: string | null;
}

const PUSH_SUBSCRIPTION_CHANGED_EVENT =
  "transparencia:push-subscription-changed";

interface PushSubscriptionChangedDetail {
  isSubscribed: boolean;
  permission?: NotificationPermission | "unsupported";
}

let storeState: PushStoreState = {
  isSupported: false,
  isSubscribed: false,
  permission: "unsupported",
  isLoading: true,
  error: null,
};

const storeListeners = new Set<() => void>();

function getStoreSnapshot(): PushStoreState {
  return storeState;
}

function getServerSnapshot(): PushStoreState {
  return {
    isSupported: false,
    isSubscribed: false,
    permission: "unsupported",
    isLoading: true,
    error: null,
  };
}

function subscribeToStore(onStoreChange: () => void): () => void {
  storeListeners.add(onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
  };
}

export function updatePushStore(partial: Partial<PushStoreState>) {
  storeState = { ...storeState, ...partial };
  for (const listener of storeListeners) {
    listener();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<PushSubscriptionChangedDetail>(
        PUSH_SUBSCRIPTION_CHANGED_EVENT,
        {
          detail: {
            isSubscribed: storeState.isSubscribed,
            permission: storeState.permission,
          },
        },
      ),
    );
  }
}

let hasInitialized = false;

export async function refreshPushSubscription(): Promise<void> {
  if (!isPushNotificationSupported()) {
    updatePushStore({
      isSupported: false,
      isSubscribed: false,
      permission: "unsupported",
      isLoading: false,
    });
    return;
  }

  updatePushStore({
    isSupported: true,
    permission: Notification.permission,
  });

  try {
    let sub: PushSubscription | null = null;
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      typeof navigator.serviceWorker.getRegistration === "function"
    ) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.pushManager) {
        sub = await reg.pushManager.getSubscription();
      }
    }

    if (
      !sub &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 2500);
      });
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        timeoutPromise,
      ]);
      if (reg?.pushManager) {
        sub = await reg.pushManager.getSubscription();
      }
    }

    updatePushStore({
      isSubscribed: Boolean(sub),
      isLoading: false,
    });
  } catch (err: unknown) {
    updatePushStore({
      isLoading: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro ao consultar subscrição existente",
    });
  }
}

export function __resetPushStoreForTesting() {
  hasInitialized = false;
  storeState = {
    isSupported: false,
    isSubscribed: false,
    permission: "unsupported",
    isLoading: true,
    error: null,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== "undefined" && typeof window.btoa === "function"
    ? window.btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
}

async function getActiveServiceWorkerRegistration(
  timeoutMs = 6000,
): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service Worker não suportado neste navegador.");
  }

  if (typeof navigator.serviceWorker.getRegistration === "function") {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (
        !registration &&
        typeof navigator.serviceWorker.register === "function"
      ) {
        await navigator.serviceWorker.register("/sw.js");
      }
    } catch {
      // Falhas em getRegistration não impedem a verificação via ready
    }
  } else if (typeof navigator.serviceWorker.register === "function") {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch {
      // Falhas em register não impedem a verificação via ready
    }
  }

  const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          "Não foi possível ativar o Service Worker a tempo. Recarregue a página e tente novamente.",
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
}

export function usePushNotifications(
  options?: UsePushNotificationsOptions,
): UsePushNotificationsReturn {
  const portalSlug = options?.portalSlug ?? "porciuncula_prefeitura";
  const state = useSyncExternalStore(
    subscribeToStore,
    getStoreSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (!hasInitialized) {
      hasInitialized = true;
      refreshPushSubscription();
    }

    const handleSubscriptionChange = (e: Event) => {
      const customEvent = e as CustomEvent<PushSubscriptionChangedDetail>;
      if (
        customEvent.detail &&
        typeof customEvent.detail.isSubscribed === "boolean"
      ) {
        if (storeState.isSubscribed !== customEvent.detail.isSubscribed) {
          updatePushStore({
            isSubscribed: customEvent.detail.isSubscribed,
            permission: customEvent.detail.permission ?? storeState.permission,
          });
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        PUSH_SUBSCRIPTION_CHANGED_EVENT,
        handleSubscriptionChange,
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          PUSH_SUBSCRIPTION_CHANGED_EVENT,
          handleSubscriptionChange,
        );
      }
    };
  }, []);

  const subscribe = useCallback(
    async (topics?: string[]): Promise<boolean> => {
      updatePushStore({ error: null, isLoading: true });

      if (!isPushNotificationSupported()) {
        updatePushStore({
          error: "Notificações Web Push não suportadas neste navegador.",
          isLoading: false,
        });
        return false;
      }

      const vapidKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        updatePushStore({
          error: "Chave pública VAPID não configurada no ambiente.",
          isLoading: false,
        });
        posthog.capture("push_subscribed_failure", {
          portal_slug: portalSlug,
          reason: "missing_vapid_key",
        });
        return false;
      }

      let createdSub: PushSubscription | null = null;

      try {
        const reqPermission = await Notification.requestPermission();
        updatePushStore({ permission: reqPermission });

        if (reqPermission !== "granted") {
          posthog.capture("push_permission_denied", {
            portal_slug: portalSlug,
          });
          updatePushStore({ isLoading: false });
          return false;
        }

        const registration = await getActiveServiceWorkerRegistration();
        const appServerKey = urlBase64ToUint8Array(vapidKey);

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as unknown as BufferSource,
        });
        createdSub = sub;

        const jsonSub = sub.toJSON();
        const p256dh =
          jsonSub.keys?.p256dh ??
          (typeof sub.getKey === "function"
            ? arrayBufferToBase64(sub.getKey("p256dh"))
            : "");
        const auth =
          jsonSub.keys?.auth ??
          (typeof sub.getKey === "function"
            ? arrayBufferToBase64(sub.getKey("auth"))
            : "");

        const payload = {
          portalSlug,
          subscription: {
            endpoint: sub.endpoint || jsonSub.endpoint,
            keys: {
              p256dh,
              auth,
            },
          },
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          topics: topics ?? ["extracao", "app_update"],
        };

        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          await sub.unsubscribe().catch(() => null);
          createdSub = null;
          const body = await res.json().catch(() => ({}));
          const errMsg =
            body.error ?? `Falha ao registrar subscrição (HTTP ${res.status})`;
          throw new Error(errMsg);
        }

        updatePushStore({
          isSubscribed: true,
          permission: reqPermission,
          isLoading: false,
        });
        posthog.capture("push_notification_subscribed", {
          portal_slug: portalSlug,
        });
        posthog.capture("push_subscribed_success", {
          portal_slug: portalSlug,
        });

        return true;
      } catch (err: unknown) {
        if (createdSub) {
          await createdSub.unsubscribe().catch(() => null);
        }
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Erro inesperado ao ativar notificações";
        updatePushStore({
          isSubscribed: false,
          error: errorMsg,
          isLoading: false,
        });
        posthog.capture("push_subscribed_failure", {
          portal_slug: portalSlug,
          error: errorMsg,
        });
        return false;
      }
    },
    [portalSlug],
  );

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    updatePushStore({ error: null, isLoading: true });

    if (!isPushNotificationSupported()) {
      updatePushStore({ isLoading: false });
      return false;
    }

    try {
      const registration = await getActiveServiceWorkerRegistration().catch(
        () => null,
      );
      if (registration) {
        const sub = await registration.pushManager.getSubscription();

        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();

          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint,
              portalSlug,
            }),
          }).catch(() => null);
        }
      }

      updatePushStore({
        isSubscribed: false,
        isLoading: false,
        permission:
          typeof Notification !== "undefined"
            ? Notification.permission
            : undefined,
      });
      posthog.capture("push_notification_unsubscribed", {
        portal_slug: portalSlug,
      });
      posthog.capture("push_unsubscribed", {
        portal_slug: portalSlug,
      });

      return true;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao cancelar notificações";
      updatePushStore({
        error: errorMsg,
        isLoading: false,
      });
      return false;
    }
  }, [portalSlug]);

  return {
    isSupported: state.isSupported,
    isSubscribed: state.isSubscribed,
    permission: state.permission,
    isLoading: state.isLoading,
    error: state.error,
    subscribe,
    unsubscribe,
  };
}
