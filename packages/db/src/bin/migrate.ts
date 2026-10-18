import { closeDb, dbWrite } from "../client";
import { runMigrations } from "../migrator";

async function main() {
  console.log("[db:migrate] Executando migrações Kysely...");
  try {
    const results = await runMigrations(dbWrite);
    for (const res of results || []) {
      if (res.status === "Success") {
        console.log(
          `[db:migrate] ✓ Migração aplicada com sucesso: ${res.migrationName}`,
        );
      } else if (res.status === "Error") {
        console.error(
          `[db:migrate] ✗ Erro ao aplicar migração: ${res.migrationName}`,
        );
      }
    }
    console.log("[db:migrate] Migrações concluídas!");
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("[db:migrate] Falha fatal na execução das migrações:", err);
  process.exit(1);
});
