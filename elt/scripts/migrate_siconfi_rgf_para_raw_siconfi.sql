-- Copia siconfi_rgf de raw_<portal> para o schema único raw_siconfi (Story 26.5).
-- Idempotente. `portal_slug` é derivado do nome do schema de origem (raw_<portal_slug>).
-- Confere que toda linha de origem existe em raw_siconfi com o mesmo valor (linhas novas já carregadas lá são aceitas); se faltar alguma, aborta.
-- As tabelas antigas NÃO são apagadas (remoção na 26.4), o que mantém a reversão simples.
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este arquivo>
-- Depois da migração, rode `make dbt/run` (stg_siconfi__rgf e fct_pessoal_rgf_metricas).
-- Só rodar em produção com autorização explícita (Regra 15).
BEGIN;
-- Conferência de paridade sem índice excede o statement_timeout do pooler; vale só nesta transação.
SET LOCAL statement_timeout = 0;

CREATE SCHEMA IF NOT EXISTS raw_siconfi;
CREATE TABLE IF NOT EXISTS raw_siconfi.siconfi_rgf (
    portal_slug TEXT NOT NULL,
    ano INTEGER NOT NULL,
    cod_ibge INTEGER NOT NULL,
    periodicidade TEXT NOT NULL,
    periodo INTEGER NOT NULL,
    anexo TEXT NOT NULL,
    cod_conta TEXT NOT NULL,
    conta TEXT,
    coluna TEXT NOT NULL,
    rotulo TEXT NOT NULL,
    valor NUMERIC,
    populacao INTEGER,
    data_extracao TEXT,
    PRIMARY KEY (portal_slug, ano, cod_ibge, periodicidade, periodo, anexo, cod_conta, coluna, rotulo)
);

DO $$
DECLARE
    antiga RECORD;
    slug TEXT;
    linhas_antigas BIGINT;
    linhas_identicas BIGINT;
BEGIN
    FOR antiga IN
        SELECT table_schema FROM information_schema.tables
        WHERE table_name = 'siconfi_rgf' AND table_schema LIKE 'raw\_%' AND table_schema <> 'raw_siconfi'
    LOOP
        slug := substr(antiga.table_schema, 5);
        EXECUTE format(
            'INSERT INTO raw_siconfi.siconfi_rgf
                 (portal_slug, ano, cod_ibge, periodicidade, periodo, anexo, cod_conta, conta, coluna, rotulo, valor, populacao, data_extracao)
             SELECT %L, ano::int, cod_ibge::int, periodicidade, periodo::int, anexo, cod_conta, conta, coluna, rotulo,
                 valor::numeric, populacao::int, data_extracao
             FROM %I.siconfi_rgf ON CONFLICT DO NOTHING', slug, antiga.table_schema);
        EXECUTE format('SELECT count(*) FROM %I.siconfi_rgf', antiga.table_schema) INTO linhas_antigas;
        EXECUTE format(
            'SELECT count(*) FROM %I.siconfi_rgf o WHERE EXISTS
                 (SELECT 1 FROM raw_siconfi.siconfi_rgf n WHERE n.portal_slug = %L AND n.ano = o.ano::int
                  AND n.cod_ibge = o.cod_ibge::int AND n.periodicidade = o.periodicidade AND n.periodo = o.periodo::int
                  AND n.anexo = o.anexo AND n.cod_conta = o.cod_conta AND n.coluna = o.coluna AND n.rotulo = o.rotulo
                  AND n.valor IS NOT DISTINCT FROM o.valor::numeric)', antiga.table_schema, slug) INTO linhas_identicas;
        IF linhas_antigas <> linhas_identicas THEN
            RAISE EXCEPTION 'paridade falhou em %: % linhas antigas, % idênticas em raw_siconfi', antiga.table_schema, linhas_antigas, linhas_identicas;
        END IF;
    END LOOP;
END $$;

COMMIT;
