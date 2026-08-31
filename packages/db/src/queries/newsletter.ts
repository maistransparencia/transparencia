import crypto from "node:crypto";
import { sql } from "kysely";
import { db, dbWrite } from "../client";

export type NewsletterSubscriberStatus =
  | "pendente"
  | "confirmado"
  | "cancelado";

export interface NewsletterSubscriber {
  id: string;
  portalSlug: string;
  email: string;
  status: NewsletterSubscriberStatus;
  tokenConfirmacao: string;
  tokenCancelamento: string;
  createdAt: Date | string;
  confirmedAt: Date | string | null;
  unsubscribedAt: Date | string | null;
  resendContactId: string | null;
}

interface NewsletterSubscriberRow {
  id: string;
  portal_slug: string;
  email: string;
  status: string;
  token_confirmacao: string;
  token_cancelamento: string;
  created_at: Date | string;
  confirmed_at: Date | string | null;
  unsubscribed_at: Date | string | null;
  resend_contact_id: string | null;
}

function mapRowToSubscriber(
  row: NewsletterSubscriberRow,
): NewsletterSubscriber {
  return {
    id: row.id,
    portalSlug: row.portal_slug,
    email: row.email,
    status: row.status as NewsletterSubscriberStatus,
    tokenConfirmacao: row.token_confirmacao,
    tokenCancelamento: row.token_cancelamento,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    unsubscribedAt: row.unsubscribed_at,
    resendContactId: row.resend_contact_id,
  };
}

/**
 * Cria ou atualiza uma submissão de inscrição na newsletter para o portal especificado.
 * Gera novos tokens de confirmação e cancelamento e define o status como 'pendente'.
 */
export async function subscribeNewsletter(
  portalSlug: string,
  email: string,
  dbInstance = dbWrite,
): Promise<NewsletterSubscriber> {
  const normalizedEmail = email.trim().toLowerCase();
  const tokenConfirmacao = crypto.randomUUID();
  const tokenCancelamento = crypto.randomUUID();

  const result = await sql<NewsletterSubscriberRow>`
    INSERT INTO public.newsletter_subscribers (
      portal_slug,
      email,
      status,
      token_confirmacao,
      token_cancelamento,
      created_at,
      confirmed_at,
      unsubscribed_at
    )
    VALUES (
      ${portalSlug},
      ${normalizedEmail},
      'pendente',
      ${tokenConfirmacao},
      ${tokenCancelamento},
      NOW(),
      NULL,
      NULL
    )
    ON CONFLICT (portal_slug, email) DO UPDATE
    SET
      status = 'pendente',
      token_confirmacao = ${tokenConfirmacao},
      token_cancelamento = ${tokenCancelamento},
      confirmed_at = NULL,
      unsubscribed_at = NULL
    RETURNING
      id,
      portal_slug,
      email,
      status,
      token_confirmacao,
      token_cancelamento,
      created_at,
      confirmed_at,
      unsubscribed_at,
      resend_contact_id
  `.execute(dbInstance);

  const row = result.rows[0];
  return mapRowToSubscriber(row);
}

/**
 * Confirma a inscrição de newsletter validando o token_confirmacao.
 * Transita o status para 'confirmado' e registra confirmed_at.
 */
export async function confirmNewsletterSubscription(
  token: string,
  dbInstance = dbWrite,
): Promise<NewsletterSubscriber | null> {
  const result = await sql<NewsletterSubscriberRow>`
    UPDATE public.newsletter_subscribers
    SET
      status = 'confirmado',
      confirmed_at = NOW()
    WHERE token_confirmacao = ${token}
    RETURNING
      id,
      portal_slug,
      email,
      status,
      token_confirmacao,
      token_cancelamento,
      created_at,
      confirmed_at,
      unsubscribed_at,
      resend_contact_id
  `.execute(dbInstance);

  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return mapRowToSubscriber(row);
}

/**
 * Cancela a inscrição de newsletter validando o token_cancelamento.
 * Transita o status para 'cancelado' e registra unsubscribed_at.
 */
export async function unsubscribeNewsletterByToken(
  token: string,
  dbInstance = dbWrite,
): Promise<NewsletterSubscriber | null> {
  const result = await sql<NewsletterSubscriberRow>`
    UPDATE public.newsletter_subscribers
    SET
      status = 'cancelado',
      unsubscribed_at = NOW()
    WHERE token_cancelamento = ${token}
    RETURNING
      id,
      portal_slug,
      email,
      status,
      token_confirmacao,
      token_cancelamento,
      created_at,
      confirmed_at,
      unsubscribed_at,
      resend_contact_id
  `.execute(dbInstance);

  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return mapRowToSubscriber(row);
}

/**
 * Consulta o assinante de newsletter por portal e e-mail.
 */
export async function getNewsletterSubscriber(
  portalSlug: string,
  email: string,
  dbInstance = db,
): Promise<NewsletterSubscriber | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await sql<NewsletterSubscriberRow>`
    SELECT
      id,
      portal_slug,
      email,
      status,
      token_confirmacao,
      token_cancelamento,
      created_at,
      confirmed_at,
      unsubscribed_at,
      resend_contact_id
    FROM public.newsletter_subscribers
    WHERE portal_slug = ${portalSlug} AND email = ${normalizedEmail}
    LIMIT 1
  `.execute(dbInstance);

  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return mapRowToSubscriber(row);
}
