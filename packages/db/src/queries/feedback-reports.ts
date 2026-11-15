import { sql } from "kysely";
import { dbWrite } from "../client";

export type FeedbackReportType =
  | "erro_tecnico"
  | "inconsistencia_dados"
  | "sugestao";

export interface FeedbackReportInput {
  portalSlug?: string | null;
  tipoRelato: FeedbackReportType;
  mensagem: string;
  emailRetorno?: string | null;
  rotaPagina: string;
}

/**
 * Registra o relato de um cidadão com a rota da página de onde ele falou.
 * Não guarda IP, user agent nem sessão. Devolve o id do relato criado.
 */
export async function registerFeedbackReport(
  input: FeedbackReportInput,
  dbInstance = dbWrite,
): Promise<{ id: string }> {
  const mensagem = input.mensagem.trim();
  const emailRetorno = input.emailRetorno?.trim().toLowerCase() || null;
  const portalSlug = input.portalSlug?.trim() || null;

  const result = await sql<{ id: string }>`
    INSERT INTO public.feedback_reports (
      portal_slug, tipo_relato, mensagem, email_retorno, rota_pagina
    ) VALUES (
      ${portalSlug}, ${input.tipoRelato}, ${mensagem}, ${emailRetorno}, ${input.rotaPagina}
    )
    RETURNING id
  `.execute(dbInstance);

  return { id: result.rows[0].id };
}
