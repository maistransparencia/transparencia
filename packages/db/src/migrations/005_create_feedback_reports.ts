import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .withSchema("public")
    .createTable("feedback_reports")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("portal_slug", "text")
    .addColumn("tipo_relato", "text", (col) => col.notNull())
    .addColumn("mensagem", "text", (col) => col.notNull())
    .addColumn("email_retorno", "text")
    .addColumn("rota_pagina", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("recebida"))
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`NOW()`),
    )
    .addCheckConstraint(
      "chk_feedback_reports_status",
      sql`status IN ('recebida', 'em_analise', 'resolvida', 'descartada')`,
    )
    .addCheckConstraint(
      "chk_feedback_reports_tipo_relato",
      sql`tipo_relato IN ('erro_tecnico', 'inconsistencia_dados', 'sugestao')`,
    )
    .execute();

  await db.schema
    .withSchema("public")
    .createIndex("idx_feedback_reports_portal_created")
    .ifNotExists()
    .on("feedback_reports")
    .columns(["portal_slug", "created_at"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .withSchema("public")
    .dropTable("feedback_reports")
    .ifExists()
    .execute();
}
