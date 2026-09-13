import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .withSchema("public")
    .createTable("push_subscriptions")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("portal_slug", "text", (col) => col.notNull())
    .addColumn("endpoint", "text", (col) => col.notNull().unique())
    .addColumn("p256dh", "text", (col) => col.notNull())
    .addColumn("auth", "text", (col) => col.notNull())
    .addColumn("user_agent", "text")
    .addColumn("topics", sql`text[]`, (col) =>
      col.notNull().defaultTo(sql`ARRAY['extracoes', 'versoes']::text[]`),
    )
    .addColumn("failed_attempts", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("last_failure_at", "timestamptz")
    .addColumn("last_success_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .withSchema("public")
    .createIndex("idx_push_subscriptions_portal_slug")
    .ifNotExists()
    .on("push_subscriptions")
    .column("portal_slug")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .withSchema("public")
    .dropTable("push_subscriptions")
    .ifExists()
    .execute();
}
