-- Copia as 15 tabelas restantes do Fiorilli de raw_<portal> para o schema único raw_fiorilli (Story 26.6):
-- despesas (5), receitas (4), compras (2), pessoal (2) e repasses (2).
-- Idempotente. `portal_slug` é derivado do nome do schema de origem (raw_<portal_slug>); só considera schemas que têm metadata.
-- Confere contagem e hash do conteúdo por portal/ano (origem x raw_fiorilli); se divergir, aborta.
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
        tem_ano BOOLEAN;
    expr_ano TEXT;
    expr_hash TEXT;
    divergencias BIGINT;
    linhas_antigas BIGINT;
BEGIN
    FOREACH tabela IN ARRAY ARRAY['despesas_gerais','despesas_restos_pagar','despesas_por_orgao','despesas_por_unidade','despesas_por_fornecedor','receita_orcamentaria','receita_uniao','receita_estado','receita_extra_orcamentaria','licitacoes','contratos','pessoal','diarias','transferencias','emendas_cad'] LOOP
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

            -- Conferência por portal/ano: contagem e hash do conteúdo (linha inteira como texto, mesma ordem de colunas)
            tem_ano := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = antiga.table_schema AND table_name = tabela AND column_name = 'ano');
            expr_ano := CASE WHEN tem_ano THEN 'ano::text' ELSE '''''' END;
            expr_hash := format('coalesce(sum((''x'' || substr(md5(row(%s)::text), 1, 15))::bit(60)::bigint), 0)', colunas);
            EXECUTE format('SELECT count(*) FROM (SELECT %s AS ano, count(*) AS linhas, %s AS hash FROM %I.%I GROUP BY 1) o FULL JOIN (SELECT %s AS ano, count(*) AS linhas, %s AS hash FROM raw_fiorilli.%I WHERE portal_slug = %L GROUP BY 1) n USING (ano) WHERE o.linhas IS DISTINCT FROM n.linhas OR o.hash IS DISTINCT FROM n.hash',
                expr_ano, expr_hash, antiga.table_schema, tabela, expr_ano, expr_hash, tabela, slug) INTO divergencias;
            IF divergencias > 0 THEN
                RAISE EXCEPTION 'Paridade falhou em %.%: % anos com contagem ou hash divergente entre origem e raw_fiorilli', antiga.table_schema, tabela, divergencias;
            END IF;
            EXECUTE format('SELECT count(*) FROM %I.%I', antiga.table_schema, tabela) INTO linhas_antigas;
            RAISE NOTICE '% / %: % linhas conferidas', slug, tabela, linhas_antigas;
        END LOOP;
    END LOOP;
END $$;

COMMIT;
