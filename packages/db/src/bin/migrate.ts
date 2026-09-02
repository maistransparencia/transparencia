import { closeDb, dbWrite } from "../client";
import { runMigrations } from "../migrator";

async function main() {
  // biome-ignore lint/suspicious/noConsole: script CLI de migração
  console.log("[db:migrate] Executando migrações Kysely...");
  try {
    const results = await runMigrations(dbWrite);
    for (const res of results || []) {
      if (res.status === "Success") {
        // biome-ignore lint/suspicious/noConsole: output de sucesso
        console.log(
          `[db:migrate] ✓ Migração aplicada com sucesso: ${res.migrationName}`,
        );
      } else if (res.status === "Error") {
        // biome-ignore lint/suspicious/noConsole: output de erro
        console.error(
          `[db:migrate] ✗ Erro ao aplicar migração: ${res.migrationName}`,
        );
      }
    }
    // biome-ignore lint/suspicious/noConsole: output de conclusão
    console.log("[db:migrate] Migrações concluídas!");
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  // biome-ignore lint/suspicious/noConsole: output de erro fatal
  console.error("[db:migrate] Falha fatal na execução das migrações:", err);
  process.exit(1);
});
