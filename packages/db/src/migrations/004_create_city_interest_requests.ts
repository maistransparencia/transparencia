import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .withSchema("public")
    .createTable("city_interest_requests")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("cidade", "text", (col) => col.notNull())
    .addColumn("cidade_normalizada", "text", (col) => col.notNull())
    .addColumn("uf", "text", (col) => col.notNull())
    .addColumn("consentimento", "boolean", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`NOW()`),
    )
    .addUniqueConstraint("uq_city_interest_email_cidade_uf", [
      "email",
      "cidade_normalizada",
      "uf",
    ])
    .addCheckConstraint("chk_city_interest_uf", sql`char_length(uf) = 2`)
    .execute();

  await db.schema
    .withSchema("public")
    .createIndex("idx_city_interest_requests_uf_cidade")
    .ifNotExists()
    .on("city_interest_requests")
    .columns(["uf", "cidade_normalizada"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .withSchema("public")
    .dropTable("city_interest_requests")
    .ifExists()
    .execute();
}
