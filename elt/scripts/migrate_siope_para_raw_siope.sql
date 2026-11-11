-- Migra siope_indicadores de raw_<portal> para o schema único raw_siope (Story 24.9).
-- Idempotente. Confere paridade (linhas por portal_slug) antes de remover as tabelas antigas;
-- se divergir, aborta sem apagar nada. Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este arquivo>
-- Depois da migração, rode `make dbt/run` (modelos stg_siope__indicadores e fct_educacao_siope_metricas).
-- Só rodar em produção com autorização explícita (Regra 15).
BEGIN;

CREATE SCHEMA IF NOT EXISTS raw_siope;
CREATE TABLE IF NOT EXISTS raw_siope.siope_indicadores (
    portal_slug TEXT NOT NULL,
    ano INTEGER NOT NULL,
    periodo INTEGER NOT NULL,
    tipo_periodo TEXT NOT NULL,
    codigo_indicador TEXT NOT NULL,
    codigo_interno_indicador INTEGER NOT NULL,
    unidade TEXT NOT NULL,
    nomes_oficiais_indicador TEXT NOT NULL,
    codigo_siope TEXT NOT NULL,
    valor NUMERIC,
    coletado_em TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (portal_slug, ano, periodo, codigo_indicador)
);

-- Views dbt obsoletas (staging por portal e intermediário), que dependem das tabelas antigas.
DO $$
DECLARE
    obsoleta RECORD;
BEGIN
    FOR obsoleta IN
        SELECT schemaname, viewname FROM pg_views
        WHERE viewname = 'int_siope_indicadores_consolidados'
           OR (viewname LIKE 'stg\_%\_\_siope\_indicadores' AND viewname <> 'stg_siope__indicadores')
    LOOP
        EXECUTE format('DROP VIEW %I.%I', obsoleta.schemaname, obsoleta.viewname);
    END LOOP;
END $$;

DO $$
DECLARE
    antiga RECORD;
    esperado BIGINT;
    obtido BIGINT;
BEGIN
    FOR antiga IN
        SELECT table_schema FROM information_schema.tables
        WHERE table_name = 'siope_indicadores' AND table_schema LIKE 'raw\_%' AND table_schema <> 'raw_siope'
    LOOP
        EXECUTE format(
            'INSERT INTO raw_siope.siope_indicadores SELECT portal_slug, ano, periodo, tipo_periodo, codigo_indicador,
                 codigo_interno_indicador, unidade, nomes_oficiais_indicador, codigo_siope, valor, coletado_em
             FROM %I.siope_indicadores ON CONFLICT DO NOTHING', antiga.table_schema);
        EXECUTE format('SELECT count(*) FROM %I.siope_indicadores', antiga.table_schema) INTO esperado;
        EXECUTE format(
            'SELECT count(*) FROM raw_siope.siope_indicadores n WHERE EXISTS
                 (SELECT 1 FROM %I.siope_indicadores o WHERE o.portal_slug = n.portal_slug AND o.ano = n.ano
                  AND o.periodo = n.periodo AND o.codigo_indicador = n.codigo_indicador
                  AND o.valor IS NOT DISTINCT FROM n.valor)', antiga.table_schema) INTO obtido;
        IF esperado <> obtido THEN
            RAISE EXCEPTION 'paridade falhou em %: % linhas antigas, % idênticas no raw_siope', antiga.table_schema, esperado, obtido;
        END IF;
        EXECUTE format('DROP TABLE %I.siope_indicadores', antiga.table_schema);
    END LOOP;
END $$;

COMMIT;
