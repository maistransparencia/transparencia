/** Código do Postgres para tabela ou view inexistente (`undefined_table`). */
const UNDEFINED_TABLE_CODE = "42P01";

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === UNDEFINED_TABLE_CODE
  );
}

/**
 * Lê um mart e devolve `fallback` quando a tabela ainda não existe no banco.
 * A Vercel publica a web logo após o merge, mas o dbt de produção só cria um mart
 * novo na ingestão noturna; sem esta guarda a página inteira cai até lá.
 */
export async function readMartOrFallback<T>(
  martName: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isUndefinedTableError(error)) throw error;
    // biome-ignore lint/suspicious/noConsole: o aviso mostra nos logs da plataforma que o mart ainda não foi criado pelo dbt.
    console.warn(
      `[db] Mart ${martName} não existe no banco; seção sem dado até o próximo dbt.`,
    );
    return fallback;
  }
}
