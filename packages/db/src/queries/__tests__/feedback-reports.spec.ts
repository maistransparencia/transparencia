import { sql } from "kysely";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dbWrite } from "../../client";
import { runMigrations } from "../../migrator";
import { registerFeedbackReport } from "../feedback-reports";

const ROTA = "/portal_teste_feedback/receitas";

describe("feedback reports queries", () => {
  beforeAll(async () => {
    await runMigrations(dbWrite);
  });

  beforeEach(async () => {
    await sql`DELETE FROM public.feedback_reports WHERE rota_pagina LIKE '/portal_teste_feedback%'`.execute(
      dbWrite,
    );
  });

  it("grava o relato com status recebida, portal e rota", async () => {
    const { id } = await registerFeedbackReport({
      portalSlug: "portal_teste_feedback",
      tipoRelato: "inconsistencia_dados",
      mensagem: "  O valor da receita diverge da fonte oficial.  ",
      emailRetorno: " Cidadao@Exemplo.com ",
      rotaPagina: ROTA,
    });
    const rows = await sql<Record<string, string | null>>`
      SELECT * FROM public.feedback_reports WHERE id = ${id}
    `.execute(dbWrite);
    expect(rows.rows[0]).toMatchObject({
      portal_slug: "portal_teste_feedback",
      tipo_relato: "inconsistencia_dados",
      mensagem: "O valor da receita diverge da fonte oficial.",
      email_retorno: "cidadao@exemplo.com",
      rota_pagina: ROTA,
      status: "recebida",
    });
  });

  it("aceita portal e e-mail ausentes", async () => {
    const { id } = await registerFeedbackReport({
      tipoRelato: "sugestao",
      mensagem: "Seria bom ter um filtro por mês.",
      emailRetorno: "  ",
      rotaPagina: "/portal_teste_feedback",
    });
    const rows = await sql<{
      portal_slug: string | null;
      email_retorno: string | null;
    }>`SELECT portal_slug, email_retorno FROM public.feedback_reports WHERE id = ${id}`.execute(
      dbWrite,
    );
    expect(rows.rows[0]).toEqual({ portal_slug: null, email_retorno: null });
  });

  it("rejeita tipo de relato fora do catálogo", async () => {
    await expect(
      registerFeedbackReport({
        tipoRelato: "outro" as never,
        mensagem: "Mensagem com tipo inválido.",
        rotaPagina: ROTA,
      }),
    ).rejects.toThrow();
  });
});
