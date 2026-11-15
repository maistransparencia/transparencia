-- Copia as 6 tabelas sem leitor dbt do Fiorilli de raw_<portal> para o schema único raw_fiorilli (Story 26.3):
-- despesas_extra_orcamentaria, despesas_por_exigibilidade, emendas_impositivas, empresas, receita_detalhes, metadata.
-- Idempotente. `portal_slug` é derivado do nome do schema de origem (raw_<portal_slug>); só considera schemas que têm metadata.
-- Confere que toda linha de origem existe em raw_fiorilli (mesma chave e mesmo conteúdo); se faltar alguma, aborta.
-- As tabelas antigas NÃO são apagadas (remoção na 26.4), o que mantém a reversão simples.
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este arquivo>
-- Só rodar em produção com autorização explícita (Regra 15).
BEGIN;

CREATE SCHEMA IF NOT EXISTS raw_fiorilli;

DO $$
DECLARE
    tabela TEXT;
    antiga RECORD;
    slug TEXT;
    chave TEXT[];
    colunas TEXT;
    condicao_chave TEXT;
    linhas_antigas BIGINT;
    linhas_presentes BIGINT;
BEGIN
    FOREACH tabela IN ARRAY ARRAY['despesas_extra_orcamentaria','despesas_por_exigibilidade','emendas_impositivas','empresas','receita_detalhes','metadata'] LOOP
        FOR antiga IN
            SELECT table_schema FROM information_schema.tables
            WHERE table_name = tabela AND table_schema LIKE 'raw\_%' AND table_schema <> 'raw_fiorilli'
              AND table_schema IN (SELECT table_schema FROM information_schema.tables WHERE table_name = 'metadata')
        LOOP
            slug := substr(antiga.table_schema, 5);
            -- Chave = PK da origem (o loader só inclui na chave as colunas que existem na tabela), sem portal_slug
            SELECT array_agg(a.attname::text ORDER BY array_position(i.indkey::int2[], a.attnum)) INTO chave
            FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = format('%I.%I', antiga.table_schema, tabela)::regclass AND i.indisprimary AND a.attname <> 'portal_slug';
            IF chave IS NULL THEN
                RAISE EXCEPTION '%.% sem chave primária; defina a chave antes de migrar', antiga.table_schema, tabela;
            END IF;
            SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position) INTO colunas
            FROM information_schema.columns
            WHERE table_schema = antiga.table_schema AND table_name = tabela AND column_name <> 'portal_slug';

            EXECUTE format('CREATE TABLE IF NOT EXISTS raw_fiorilli.%I (portal_slug TEXT NOT NULL)', tabela);
            -- Colunas da origem ainda ausentes no destino (TEXT, Regra 16)
            EXECUTE (SELECT coalesce(string_agg(format('ALTER TABLE raw_fiorilli.%I ADD COLUMN IF NOT EXISTS %I TEXT', tabela, column_name), '; '), 'SELECT 1')
                     FROM information_schema.columns WHERE table_schema = antiga.table_schema AND table_name = tabela AND column_name <> 'portal_slug');
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = format('raw_fiorilli.%I', tabela)::regclass AND contype = 'p') THEN
                EXECUTE format('ALTER TABLE raw_fiorilli.%I ADD PRIMARY KEY (portal_slug, %s)', tabela,
                    (SELECT string_agg(format('%I', k), ', ') FROM unnest(chave) k));
            END IF;

            EXECUTE format('INSERT INTO raw_fiorilli.%I (portal_slug, %s) SELECT %L, %s FROM %I.%I ON CONFLICT DO NOTHING',
                tabela, colunas, slug, colunas, antiga.table_schema, tabela);

            EXECUTE format('SELECT count(*) FROM %I.%I', antiga.table_schema, tabela) INTO linhas_antigas;
            condicao_chave := (SELECT string_agg(format('n.%I::text IS NOT DISTINCT FROM o.%I::text', k, k), ' AND ') FROM unnest(chave) k);
            EXECUTE format('SELECT count(*) FROM %I.%I o WHERE EXISTS (SELECT 1 FROM raw_fiorilli.%I n WHERE n.portal_slug = %L AND %s)',
                antiga.table_schema, tabela, tabela, slug, condicao_chave) INTO linhas_presentes;
            IF linhas_presentes <> linhas_antigas THEN
                RAISE EXCEPTION 'Paridade falhou em %.%: % linhas na origem, % presentes em raw_fiorilli', antiga.table_schema, tabela, linhas_antigas, linhas_presentes;
            END IF;
            RAISE NOTICE '% / %: % linhas conferidas', slug, tabela, linhas_antigas;
        END LOOP;
    END LOOP;
END $$;

COMMIT;
