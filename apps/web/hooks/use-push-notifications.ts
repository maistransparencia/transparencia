"use client";

import posthog from "posthog-js";
import { useCallback, useEffect, useState } from "react";
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

export function usePushNotifications(
  options?: UsePushNotificationsOptions,
): UsePushNotificationsReturn {
  const portalSlug = options?.portalSlug ?? "porciuncula_prefeitura";
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushNotificationSupported()) {
      setIsSupported(false);
      setPermission("unsupported");
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    let isMounted = true;

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3000);
    });

    Promise.race([
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription(),
      ),
      timeoutPromise,
    ])
      .then((sub) => {
        if (isMounted) {
          setIsSubscribed(Boolean(sub));
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setIsLoading(false);
          const msg =
            err instanceof Error
              ? err.message
              : "Erro ao consultar subscrição existente";
          setError(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const subscribe = useCallback(
    async (topics?: string[]): Promise<boolean> => {
      setError(null);
      setIsLoading(true);

      if (!isPushNotificationSupported()) {
        setError("Notificações Web Push não suportadas neste navegador.");
        setIsLoading(false);
        return false;
      }

      const vapidKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("Chave pública VAPID não configurada no ambiente.");
        posthog.capture("push_subscribed_failure", {
          portal_slug: portalSlug,
          reason: "missing_vapid_key",
        });
        setIsLoading(false);
        return false;
      }

      try {
        const reqPermission = await Notification.requestPermission();
        setPermission(reqPermission);

        if (reqPermission !== "granted") {
          posthog.capture("push_permission_denied", {
            portal_slug: portalSlug,
          });
          setIsLoading(false);
          return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const appServerKey = urlBase64ToUint8Array(vapidKey);

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as unknown as BufferSource,
        });

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
          const body = await res.json().catch(() => ({}));
          const errMsg =
            body.error ?? `Falha ao registrar subscrição (HTTP ${res.status})`;
          throw new Error(errMsg);
        }

        setIsSubscribed(true);
        posthog.capture("push_notification_subscribed", {
          portal_slug: portalSlug,
        });
        posthog.capture("push_subscribed_success", {
          portal_slug: portalSlug,
        });

        setIsLoading(false);
        return true;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Erro inesperado ao ativar notificações";
        setError(errorMsg);
        posthog.capture("push_subscribed_failure", {
          portal_slug: portalSlug,
          error: errorMsg,
        });
        setIsLoading(false);
        return false;
      }
    },
    [portalSlug],
  );

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    if (!isPushNotificationSupported()) {
      setIsLoading(false);
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
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

      setIsSubscribed(false);
      posthog.capture("push_notification_unsubscribed", {
        portal_slug: portalSlug,
      });
      posthog.capture("push_unsubscribed", {
        portal_slug: portalSlug,
      });

      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao cancelar notificações";
      setError(errorMsg);
      setIsLoading(false);
      return false;
    }
  }, [portalSlug]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
