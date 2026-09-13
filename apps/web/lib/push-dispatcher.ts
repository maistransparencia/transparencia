import {
  getActivePushSubscriptions,
  prunePushSubscriptions,
  recordPushNotificationFailure,
  recordPushNotificationSuccess,
} from "@transparencia/db";
import webpush from "web-push";
import { env } from "@/env";

export interface DispatchPushNotificationOptions {
  portalSlug?: string;
  title: string;
  body: string;
  url?: string;
  topic?: string;
  dryRun?: boolean;
}

export interface DispatchPushNotificationResult {
  totalSubscribers: number;
  sentCount: number;
  failedCount: number;
  prunedCount: number;
  dryRun: boolean;
  success: boolean;
  errors: Array<{ endpoint: string; error: string }>;
}

let vapidConfigured = false;

function initVapid(): boolean {
  if (vapidConfigured) {
    return true;
  }

  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    // biome-ignore lint/suspicious/noConsole: Log de aviso de configuração do servidor
    console.warn(
      "[PUSH_DISPATCHER] Chaves VAPID não configuradas. Envio de push desativado.",
    );
    return false;
  }

  try {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    vapidConfigured = true;
    return true;
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Log de erro de configuração de VAPID
    console.error(
      "[PUSH_DISPATCHER] Falha ao configurar VAPID details:",
      error,
    );
    return false;
  }
}

function resolveNotificationUrl(url?: string, portalSlug?: string): string {
  if (url) {
    return url;
  }
  if (portalSlug) {
    return `/${portalSlug}`;
  }
  return "/";
}

/**
 * Despacha notificação Web Push para subscrições registradas.
 * Trata erros de entrega, realiza poda automática de endpoints expirados (410/404)
 * e atualiza estatísticas de sucesso e falha no banco de dados.
 */
export async function dispatchPushNotification(
  options: DispatchPushNotificationOptions,
): Promise<DispatchPushNotificationResult> {
  const isVapidReady = initVapid();
  const allSubs = await getActivePushSubscriptions(options.portalSlug);

  const subs = options.topic
    ? allSubs.filter((sub) =>
        sub.topics ? sub.topics.includes(options.topic as string) : true,
      )
    : allSubs;

  if (options.dryRun) {
    return {
      totalSubscribers: subs.length,
      sentCount: subs.length,
      failedCount: 0,
      prunedCount: 0,
      dryRun: true,
      success: true,
      errors: [],
    };
  }

  if (!isVapidReady) {
    return {
      totalSubscribers: subs.length,
      sentCount: 0,
      failedCount: 0,
      prunedCount: 0,
      dryRun: false,
      success: false,
      errors: [
        {
          endpoint: "all",
          error: "VAPID credentials not configured on server",
        },
      ],
    };
  }

  const targetUrl = resolveNotificationUrl(options.url, options.portalSlug);
  const payload = JSON.stringify({
    title: options.title,
    body: options.body,
    url: targetUrl,
  });

  const expiredEndpoints: string[] = [];
  const successEndpoints: string[] = [];
  const failureEndpoints: string[] = [];
  const errors: Array<{ endpoint: string; error: string }> = [];

  const BATCH_SIZE = 25;
  const chunks = Array.from(
    { length: Math.ceil(subs.length / BATCH_SIZE) },
    (_, i) => subs.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
  );

  for (const chunk of chunks) {
    await Promise.allSettled(
      chunk.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
            { TTL: 86400 },
          );
          successEndpoints.push(sub.endpoint);
        } catch (err: unknown) {
          const errorObj = err as
            | { statusCode?: number; status?: number; message?: string }
            | undefined;
          const statusCode = errorObj?.statusCode ?? errorObj?.status;
          if (statusCode === 410 || statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            failureEndpoints.push(sub.endpoint);
          }
          errors.push({
            endpoint: sub.endpoint,
            error: errorObj?.message ?? "Push delivery failed",
          });
        }
      }),
    );
  }

  if (expiredEndpoints.length > 0) {
    await prunePushSubscriptions(expiredEndpoints);
  }
  if (successEndpoints.length > 0) {
    await recordPushNotificationSuccess(successEndpoints);
  }
  if (failureEndpoints.length > 0) {
    await recordPushNotificationFailure(failureEndpoints);
  }

  return {
    totalSubscribers: subs.length,
    sentCount: successEndpoints.length,
    failedCount: failureEndpoints.length + expiredEndpoints.length,
    prunedCount: expiredEndpoints.length,
    dryRun: false,
    success: failureEndpoints.length === 0,
    errors,
  };
}
