// Banco dos testes: o `postgres_test` do docker-compose.yml (porta 5545, sem volume).
// Os testes inserem e apagam linhas, então nunca rodam no banco de desenvolvimento (5544)
// nem em banco remoto, mesmo que DATABASE_URL ou o .env apontem para lá.

export const TEST_DATABASE_URL_PADRAO =
  "postgresql://postgres:postgres@localhost:5545/postgres";

const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const PORTA_BANCO_TESTE = "5545";

export function motivoRecusaUrlTeste(databaseUrl: string): string | null {
  const url = new URL(databaseUrl);
  if (!HOSTS_LOCAIS.has(url.hostname)) {
    return `host "${url.hostname}" não é local (produção ou banco remoto)`;
  }
  if (url.port !== PORTA_BANCO_TESTE) {
    return `porta ${url.port || "padrão"} não é a do banco de teste (${PORTA_BANCO_TESTE}); 5544 é o banco de desenvolvimento`;
  }
  return null;
}

/** URL do banco de teste: só TEST_DATABASE_URL, nunca DATABASE_URL. Recusa o que não for o 5545 local. */
export function resolverTestDatabaseUrl(): string {
  const databaseUrl = process.env.TEST_DATABASE_URL || TEST_DATABASE_URL_PADRAO;
  const motivo = motivoRecusaUrlTeste(databaseUrl);
  if (motivo) {
    throw new Error(
      `Testes recusados: ${motivo}. Os testes gravam e apagam dados e só rodam no banco de teste.`,
    );
  }
  return databaseUrl;
}
