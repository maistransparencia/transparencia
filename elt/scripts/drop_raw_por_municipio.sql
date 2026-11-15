-- Remove os schemas raw_<portal> (um por município) depois da migração para raw_<fonte> (Story 26.4).
-- Aborta, sem apagar nada, se algum schema raw_<portal> ainda tiver leitor (view dependente fora do próprio schema)
-- ou se alguma tabela de origem tiver mais linhas que a correspondente em raw_<fonte> para aquele portal_slug.
-- Considera só schemas com tabela `metadata` que não sejam schemas de fonte (lista abaixo). Idempotente, transação única.
-- Antes: make db/backup. Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este arquivo>
-- NÃO rodar em produção sem autorização explícita do Julio (Regra 15).
BEGIN;

DO $$
DECLARE
    schemas_de_fonte TEXT[] := ARRAY['raw_fiorilli', 'raw_siconfi'];
    antigo RECORD;
    tabela RECORD;
    slug TEXT;
    linhas_antigas BIGINT;
    linhas_novas BIGINT;
    leitores BIGINT;
BEGIN
    FOR antigo IN
        SELECT table_schema FROM information_schema.tables
        WHERE table_name = 'metadata' AND table_schema LIKE 'raw\_%' AND NOT (table_schema = ANY (schemas_de_fonte))
    LOOP
        slug := substr(antigo.table_schema, 5);

        SELECT count(DISTINCT r.oid) INTO leitores
        FROM pg_depend d
        JOIN pg_rewrite r ON r.oid = d.objid
        JOIN pg_class v ON v.oid = r.ev_class
        JOIN pg_namespace vn ON vn.oid = v.relnamespace AND vn.nspname <> antigo.table_schema
        JOIN pg_class t ON t.oid = d.refobjid
        JOIN pg_namespace tn ON tn.oid = t.relnamespace AND tn.nspname = antigo.table_schema;
        IF leitores > 0 THEN
            RAISE EXCEPTION 'schema % ainda tem % leitor(es); abortando sem apagar', antigo.table_schema, leitores;
        END IF;

        FOR tabela IN
            SELECT t.table_name, p.table_schema AS novo_schema
            FROM information_schema.tables t
            JOIN information_schema.tables p
              ON p.table_name = t.table_name AND p.table_schema = ANY (schemas_de_fonte)
            JOIN information_schema.columns c
              ON c.table_schema = p.table_schema AND c.table_name = p.table_name AND c.column_name = 'portal_slug'
            WHERE t.table_schema = antigo.table_schema
        LOOP
            EXECUTE format('SELECT count(*) FROM %I.%I', antigo.table_schema, tabela.table_name) INTO linhas_antigas;
            EXECUTE format('SELECT count(*) FROM %I.%I WHERE portal_slug = %L', tabela.novo_schema, tabela.table_name, slug)
                INTO linhas_novas;
            IF linhas_novas < linhas_antigas THEN
                RAISE EXCEPTION 'paridade divergente: %.% (% linhas) vs %.% (% linhas); abortando',
                    antigo.table_schema, tabela.table_name, linhas_antigas, tabela.novo_schema, tabela.table_name, linhas_novas;
            END IF;
        END LOOP;

        EXECUTE format('DROP SCHEMA %I CASCADE', antigo.table_schema);
        RAISE NOTICE 'schema % removido', antigo.table_schema;
    END LOOP;
END $$;

COMMIT;
