import { sql } from "kysely";
import { db, dbWrite } from "../client";

export interface PushSubscription {
  id: string;
  portalSlug: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  topics: string[] | null;
  createdAt: Date | string;
  lastNotifiedAt: Date | string | null;
  failedAttempts: number;
}

export interface SavePushSubscriptionInput {
  portalSlug: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  topics?: string[] | null;
}

interface PushSubscriptionRow {
  id: string;
  portal_slug: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  topics: string[] | null;
  created_at: Date | string;
  last_notified_at: Date | string | null;
  failed_attempts: number;
}

function mapRowToPushSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    id: row.id,
    portalSlug: row.portal_slug,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent,
    topics: row.topics,
    createdAt: row.created_at,
    lastNotifiedAt: row.last_notified_at,
    failedAttempts: Number(row.failed_attempts),
  };
}

/**
 * Cria ou atualiza uma subscrição de Web Push para o endpoint especificado.
 * Executa upsert idempotente renovando chaves e zerando contadores de falhas.
 */
export async function savePushSubscription(
  input: SavePushSubscriptionInput,
  dbInstance = dbWrite,
): Promise<PushSubscription> {
  const userAgent = input.userAgent ?? null;
  const topics = input.topics ?? ["extracoes", "versoes"];

  const result = await sql<PushSubscriptionRow>`
    INSERT INTO public.push_subscriptions (
      portal_slug,
      endpoint,
      p256dh,
      auth,
      user_agent,
      topics,
      created_at,
      failed_attempts
    )
    VALUES (
      ${input.portalSlug},
      ${input.endpoint},
      ${input.p256dh},
      ${input.auth},
      ${userAgent},
      ${topics}::text[],
      NOW(),
      0
    )
    ON CONFLICT (endpoint) DO UPDATE
    SET
      portal_slug = ${input.portalSlug},
      p256dh = ${input.p256dh},
      auth = ${input.auth},
      user_agent = ${userAgent},
      topics = ${topics}::text[],
      failed_attempts = 0
    RETURNING
      id,
      portal_slug,
      endpoint,
      p256dh,
      auth,
      user_agent,
      topics,
      created_at,
      last_notified_at,
      failed_attempts
  `.execute(dbInstance);

  const row = result.rows[0];
  return mapRowToPushSubscription(row);
}

/**
 * Remove uma subscrição de Web Push pelo endpoint (e opcionalmente portalSlug).
 * Retorna true se a linha foi removida, false caso não encontrada.
 */
export async function removePushSubscription(
  endpoint: string,
  portalSlug?: string,
  dbInstance = dbWrite,
): Promise<boolean> {
  const query = portalSlug
    ? sql<{ id: string }>`
        DELETE FROM public.push_subscriptions
        WHERE endpoint = ${endpoint} AND portal_slug = ${portalSlug}
        RETURNING id
      `
    : sql<{ id: string }>`
        DELETE FROM public.push_subscriptions
        WHERE endpoint = ${endpoint}
        RETURNING id
      `;

  const result = await query.execute(dbInstance);
  return result.rows.length > 0;
}

/**
 * Consulta subscrições ativas no banco de dados, com filtro opcional por portal.
 */
export async function getActivePushSubscriptions(
  portalSlug?: string,
  dbInstance = db,
): Promise<PushSubscription[]> {
  const query = portalSlug
    ? sql<PushSubscriptionRow>`
        SELECT
          id,
          portal_slug,
          endpoint,
          p256dh,
          auth,
          user_agent,
          topics,
          created_at,
          last_notified_at,
          failed_attempts
        FROM public.push_subscriptions
        WHERE portal_slug = ${portalSlug} AND failed_attempts < 5
        ORDER BY created_at ASC
      `
    : sql<PushSubscriptionRow>`
        SELECT
          id,
          portal_slug,
          endpoint,
          p256dh,
          auth,
          user_agent,
          topics,
          created_at,
          last_notified_at,
          failed_attempts
        FROM public.push_subscriptions
        WHERE failed_attempts < 5
        ORDER BY created_at ASC
      `;

  const result = await query.execute(dbInstance);
  return result.rows.map(mapRowToPushSubscription);
}

/**
 * Remove em lote endpoints que foram revogados ou retornaram HTTP 410/404.
 */
export async function prunePushSubscriptions(
  endpoints: string[],
  dbInstance = dbWrite,
): Promise<number> {
  if (endpoints.length === 0) {
    return 0;
  }

  const result = await sql<{ id: string }>`
    DELETE FROM public.push_subscriptions
    WHERE endpoint = ANY(${endpoints}::text[])
    RETURNING id
  `.execute(dbInstance);

  return result.rows.length;
}

/**
 * Registra envio com sucesso para uma lista de endpoints, atualizando last_notified_at e zerando falhas.
 */
export async function recordPushNotificationSuccess(
  endpoints: string[],
  dbInstance = dbWrite,
): Promise<void> {
  if (endpoints.length === 0) {
    return;
  }

  await sql`
    UPDATE public.push_subscriptions
    SET
      last_notified_at = NOW(),
      failed_attempts = 0
    WHERE endpoint = ANY(${endpoints}::text[])
  `.execute(dbInstance);
}

/**
 * Incrementa o contador de tentativas com falha para uma lista de endpoints.
 */
export async function recordPushNotificationFailure(
  endpoints: string[],
  dbInstance = dbWrite,
): Promise<void> {
  if (endpoints.length === 0) {
    return;
  }

  await sql`
    UPDATE public.push_subscriptions
    SET failed_attempts = failed_attempts + 1
    WHERE endpoint = ANY(${endpoints}::text[])
  `.execute(dbInstance);
}
