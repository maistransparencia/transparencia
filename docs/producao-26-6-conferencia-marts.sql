-- Conferência dos marts da Story 26.6 (somente leitura). Rodar ANTES do dbt run e DEPOIS; comparar as saídas.
-- Uso: psql "$DATABASE_URL" -AtF'|' -f docs/producao-26-6-conferencia-marts.sql > antes.txt   (depois: depois.txt; diff antes.txt depois.txt)
-- fct_despesas: linhas de restos a pagar podem diferir em função/subfunção/elemento (empate no distinct on); por isso o resumo abaixo
-- por portal/fonte (contagem e soma de valores) deve ser idêntico mesmo quando o hash de fct_despesas divergir.
select 'fct_receitas' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_receitas t group by portal_slug
union all
select 'fct_receita_extra_orcamentaria' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_receita_extra_orcamentaria t group by portal_slug
union all
select 'fct_despesas' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_despesas t group by portal_slug
union all
select 'fct_despesas_por_orgao' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_despesas_por_orgao t group by portal_slug
union all
select 'fct_despesas_por_unidade' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_despesas_por_unidade t group by portal_slug
union all
select 'fct_despesas_por_fornecedor' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_despesas_por_fornecedor t group by portal_slug
union all
select 'fct_licitacoes' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_licitacoes t group by portal_slug
union all
select 'fct_contratos' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_contratos t group by portal_slug
union all
select 'fct_pessoal' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_pessoal t group by portal_slug
union all
select 'fct_diarias' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_diarias t group by portal_slug
union all
select 'fct_transferencias' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_transferencias t group by portal_slug
union all
select 'fct_emendas' as mart, portal_slug, count(*) as linhas, md5(string_agg(md5(t::text), '' order by md5(t::text))) as hash from analytics.fct_emendas t group by portal_slug
order by 1, 2;

select 'resumo_fct_despesas' as mart, portal_slug, fonte, count(*) as linhas, sum(empenhado) as empenhado, sum(liquidado) as liquidado, sum(pago) as pago
from analytics.fct_despesas group by portal_slug, fonte order by 2, 3;
