# Epic 26 Context: Camada Raw por Fonte (Fim do Schema por Município)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Passar a camada raw de "um schema por município" (`raw_<portal_slug>`) para "um schema por fonte" (`raw_siope`, `raw_siconfi`, `raw_fiorilli`...), com `portal_slug` como coluna e parte da chave primária de cada tabela. Motivo: escalabilidade; com muitos municípios, um schema por município (dezenas de tabelas cada) pesa no catálogo do Postgres, no `pg_dump`, nas migrações e nos `source` do dbt.

## Stories

- Story 26.1: Siconfi (MSC Patrimonial) em schema por fonte (concluída)
- Story 26.2: Inventário e plano de migração do legado raw por município (concluída)
- Story 26.3: Fiorilli em `raw_fiorilli`: base do loader e tabelas sem leitor dbt
- Story 26.4: Remoção dos schemas por município e dos modelos de consolidação
- Story 26.5: Migração do RGF (`siconfi_rgf`) para `raw_siconfi`
- Story 26.6: Fiorilli: todas as tabelas restantes numa story só (antigas 26.6 a 26.9)

## Requirements & Constraints

- O schema é da fonte (fornecedor do portal ou fonte oficial), não do município; o nome vem de `PortalConfig.provider`.
- Toda fonte nova nasce por fonte, com `portal_slug` na chave.
- Paridade de dados antes e depois (contagens e totais por portal e saídas dos marts consumidores); recarga isolada por portal (`where portal_slug = ...`); plano de reversão; mudança de chave primária pode exigir `full-refresh`.
- Nada em produção sem autorização explícita do Julio (Regra 15); backup local com `make db/backup` antes de migrar. Carga/migração em produção só no fechamento da epic.
- `int_*_consolidadas.sql` deixam de ser necessários (Regra 23: sem literal de tenant, joins e `GROUP BY` com `portal_slug`).
- Ajustar modelos dbt, `source` e a fixture `schema.sql.gz` (Regra 21).

## Technical Decisions

- Modelo a seguir: Story 24.9 (SIOPE em `raw_siope`) e 26.1 (`raw_siconfi`): corte direto, `portal_slug` aplicado na carga, script SQL idempotente de migração que deriva o slug do nome do schema, confere linhas e valores e não apaga as tabelas antigas.
- Já por fonte: `raw_siope`, `raw_siops`, `raw_farmacia_sus`, `raw_pncp`, `raw_obrasgov`, `raw_saude_rede`, `raw_inep_censo`, `raw_emendas_*`.
- Legado por município: `raw_porciuncula_prefeitura` e `raw_natividade_prefeitura` (mesmo conjunto: contratos, `despesas_*`, diarias, `emendas_*`, empresas, licitacoes, metadata, pessoal, `receita_*`, transferencias).
- A 26.3 criou um mapa temporário de tabelas migradas no loader; a 26.4 o removeu (schema fixo `raw_<provider>` com `portal_slug` na chave). Scripts de migração ficam em `elt/scripts/migrate_*_para_raw_fiorilli.sql`.
- Escala do `raw_<fonte>`: limiares (20 municípios por provedor, 5 milhões de linhas, 10 min de carga, 150 colunas) em `elt/core/config.py`, avisados no log da carga mensal; nota de desenho em `docs/raw-por-fonte-escala.md`. A 26.4 entregou isso e o script `elt/scripts/drop_raw_por_municipio.sql` (não executado); a remoção do legado (staging por portal, `int_*_consolidad*`, `raw_schema`) foi concluída depois das 26.3, 26.5 e 26.6; resta só o DROP em produção, com o Julio.
- Receitas por CSV são carga manual em produção; o código novo precisa estar em produção antes do próximo CSV.

## Cross-Story Dependencies

- Ordem de execução: 26.3, 26.6, 26.5, 26.4 (a 26.4 vai por último).
- 26.3 cria a base do loader usada pela 26.6; 26.5 (RGF) segue o método da 26.1.
- Relação com a pendência de migração de PK/`full-refresh` da Epic 19.
