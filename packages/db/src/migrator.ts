import type { Kysely } from "kysely";
import {
  type Migration,
  type MigrationProvider,
  type MigrationResult,
  Migrator,
} from "kysely/migration";
import { dbWrite } from "./client";
import * as migration001 from "./migrations/001_create_newsletter_subscribers";
import * as migration002 from "./migrations/002_create_push_subscriptions";

const migrations: Record<string, Migration> = {
  "001_create_newsletter_subscribers": migration001,
  "002_create_push_subscriptions": migration002,
};

class InlineMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return migrations;
  }
}

export function createMigrator(
  dbInstance: Kysely<unknown> = dbWrite,
): Migrator {
  return new Migrator({
    db: dbInstance,
    provider: new InlineMigrationProvider(),
  });
}

export async function runMigrations(
  dbInstance: Kysely<unknown> = dbWrite,
): Promise<MigrationResult[] | undefined> {
  const migrator = createMigrator(dbInstance);
  const { error, results } = await migrator.migrateToLatest();

  if (error) {
    throw error;
  }

  return results;
}
