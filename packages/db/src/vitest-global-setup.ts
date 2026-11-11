import pg from "pg";
import { resolverTestDatabaseUrl } from "./test-database";

/**
 * Última checagem antes dos testes: o banco de teste nunca tem dados raw (o build só cria
 * tabelas vazias). Se tiver, é um banco real e os testes não rodam.
 */
export default async function verificarBancoDeTeste(): Promise<void> {
  const client = new pg.Client({ connectionString: resolverTestDatabaseUrl() });
  await client.connect();
  try {
    const { rows: tabelas } = await client.query<{ tabela: string }>(
      "SELECT format('%I.%I', schemaname, tablename) AS tabela FROM pg_tables WHERE schemaname = 'raw' OR schemaname LIKE 'raw\\_%'",
    );
    const comDados = await Promise.all(
      tabelas.map(async ({ tabela }) => {
        const { rows } = await client.query<{ existe: boolean }>(
          `SELECT EXISTS (SELECT 1 FROM ${tabela}) AS existe`,
        );
        return rows[0]?.existe ? tabela : null;
      }),
    );
    const primeira = comDados.find((tabela) => tabela !== null);
    if (primeira) {
      throw new Error(
        `Testes recusados: há dados em ${primeira}. O banco de teste só tem tabelas raw vazias.`,
      );
    }
  } finally {
    await client.end();
  }
}
