import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("newsletter_subscribers")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("portal_slug", "text", (col) => col.notNull())
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pendente"))
    .addColumn("token_confirmacao", "text", (col) => col.notNull().unique())
    .addColumn("token_cancelamento", "text", (col) => col.notNull().unique())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`NOW()`),
    )
    .addColumn("confirmed_at", "timestamptz")
    .addColumn("unsubscribed_at", "timestamptz")
    .addColumn("resend_contact_id", "text")
    .addUniqueConstraint("uq_newsletter_portal_email", ["portal_slug", "email"])
    .addCheckConstraint(
      "chk_newsletter_status",
      sql`status IN ('pendente', 'confirmado', 'cancelado')`,
    )
    .execute();

  await db.schema
    .createIndex("idx_newsletter_subscribers_portal")
    .ifNotExists()
    .on("newsletter_subscribers")
    .column("portal_slug")
    .execute();

  await db.schema
    .createIndex("idx_newsletter_subscribers_status")
    .ifNotExists()
    .on("newsletter_subscribers")
    .column("status")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("newsletter_subscribers").ifExists().execute();
}
