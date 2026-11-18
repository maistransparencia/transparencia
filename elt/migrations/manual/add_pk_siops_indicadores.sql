-- raw_siops.siops_indicadores criada sem chave primaria: toda linha existe duas vezes (mesmo valor e mesmo
-- coletado_em), o que quebra o teste de unicidade de stg_siops__indicadores.
-- Remove as copias (fica a de coletado_em mais recente) e cria a chave que elt/load/siops.py declara.
-- executar manualmente, uma vez, antes do proximo `make dbt/test`; idempotente.
begin;

delete from raw_siops.siops_indicadores alvo
using (
    select
        ctid as linha_fisica,
        row_number() over (
            partition by portal_slug, ano, periodo, via, codigo_indicador
            order by coletado_em desc, ctid
        ) as posicao
    from raw_siops.siops_indicadores
) duplicadas
where alvo.ctid = duplicadas.linha_fisica
    and duplicadas.posicao > 1;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'raw_siops.siops_indicadores'::regclass and contype = 'p'
    ) then
        alter table raw_siops.siops_indicadores
            add primary key (portal_slug, ano, periodo, via, codigo_indicador);
    end if;
end
$$;

commit;
