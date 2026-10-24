---
paths:
  - "elt/**"
  - "analysis/**"
  - "packages/db/tests/**"
---

## 5. SINCRONIZAÇÃO DE FONTES: dbt models ↔ `elt/conftest.py`

**Contexto:** O banco de testes utiliza uma instância efêmera do PostgreSQL (`testing.postgresql`). A função `_create_raw_schema(eng)` em [conftest.py](file:///Volumes/Projects/transparencia/elt/conftest.py) cria o schema `raw_porciuncula_prefeitura` e as tabelas raw lendo dinamicamente as definições do arquivo de metadados [_sources.yml](file:///Volumes/Projects/transparencia/elt/transform/models/staging/porciuncula_prefeitura/_sources.yml). Durante a inicialização dos testes, as views e tabelas de staging/marts são compiladas e criadas dinamicamente no banco de testes executando as etapas do dbt (`deps`, `seed` e `run --vars '{"test_mode": true}'`).

**Regra:** Toda vez que houver alteração nas tabelas raw de entrada (como novas tabelas ou novas colunas), é **obrigatório** atualizar o arquivo de fontes [_sources.yml](file:///Volumes/Projects/transparencia/elt/transform/models/staging/porciuncula_prefeitura/_sources.yml) correspondente. Não há necessidade de atualizar views ou criar tabelas manualmente no arquivo Python `conftest.py`, pois o pipeline do dbt é executado automaticamente durante o setup de testes para construir toda a estrutura derivada.

**Verificação:** Após qualquer alteração em `elt/transform/models/` ou no schema das tabelas raw, execute `make test`. Se algum teste falhar por falta de colunas ou tabelas raw, certifique-se de que elas foram devidamente declaradas em `_sources.yml`.

## 6. FORMATAÇÃO SQL

- **Sem alinhamento por espaços:** Nunca adicione espaços extras para alinhar colunas, aliases (`AS`) ou qualquer outro elemento em queries SQL de analytics (`analysis/`, `elt/`, `tests/`). Use apenas o espaço mínimo necessário para separar tokens.

## 11. BUSCAS E FILTROS DE TEXTO COM `unaccent`

- **Tratamento de Acentuação e Caixa:** Em queries SQL de analytics e modelos dbt, ao filtrar ou categorizar colunas de texto/descrição (ex: `descricao`, `resumo`, `tipo_emenda`, `destinacao`), é **obrigatório** utilizar a função `{{ target.schema }}.unaccent(lower(...))` (ou `unaccent`). Isso previne falhas de categorização causadas por variações de caixa e acentuação nos dados brutos de origem.

## 16. CAMPOS DE TEXTO NO POSTGRESQL (SEMPRE TIPO `TEXT`)

- **Proibição de `VARCHAR(n)` e `CHAR(n)`:** No PostgreSQL, não há ganho de performance em limitar o tamanho de campos de texto com `VARCHAR(n)` e essa prática impõe limitações rígidas arbitrárias.
- **Padrão Obrigatório:** Todas as colunas de texto (strings, identificadores, códigos, e-mails, tokens, slugs, descrições) em migrações, DDLs e tabelas Postgres devem utilizar exclusivamente o tipo `TEXT`.

## 21. BANCO DE TESTES DE `packages/db` CONSTRUÍDO PELO DBT (SEM FIXTURE VERSIONADO)

- **Sem artefato para manter:** O schema usado pelos testes TypeScript é construído por `make db/test/build` (`elt/scripts/build_test_db.py`: tabelas raw vazias a partir dos `_sources.yml`, `dbt seed` e `dbt run` com marts como tabelas). Não existe mais `schema.sql.gz`; é proibido reintroduzir dumps versionados do schema analítico.
- **Paridade local = CI:** O CI executa exatamente o mesmo alvo (`make db/test/build`) contra o Postgres 17.6 da mesma imagem do `docker-compose.yml` (`postgres_test`, porta 5545). Fluxo local: `docker compose up -d postgres_test && make db/test/build && make test/ts`.
- **Sincronização automática:** Alterar marts, seeds ou `_sources.yml` não exige nenhuma etapa manual extra; o próximo `make db/test/build` reflete a mudança.

## 22. PADRÕES DE ALTA PERFORMANCE EM QUERIES SQL (dbt MARTS & ANALYTICS)

- **Aggregate First, Join Later (Prevenção de Fan-Out):** Nunca execute joins entre tabelas fatos volumosas ou relações 1:N (ex: `fct_licitacoes_itens` com `fct_licitacoes`) antes de agregar. Realize primeiro o `GROUP BY` no grão desejado na tabela filha antes de cruzar com o cabeçalho, prevenindo multiplicação de linhas intermediárias e timeouts de execução.
- **Single-Scan em Janelas Temporais:** Evite escanear a mesma tabela fato múltiplas vezes para calcular o ano corrente/máximo e o histórico (ex: subqueries ou CTEs separadas com `MAX(ano)`). Utilize funções de janela analíticas como `MAX(ano) OVER (PARTITION BY portal_slug)` em um CTE base único para filtrar o grão mais recente sem re-scans.
- **Predicate Pushdown Pré-`unaccent`:** Funções textuais de normalização (`unaccent`, `lower`, `regex`) em grandes volumes são custosas e impedem otimizações de plano de execução. Aplique primeiro predicados estruturados e de particionamento (`ano >= 2021`, `categoria_regime IN (...)`) antes de invocar `unaccent()` em descrições e títulos.
- **CTEs de Consumo Especializado (Anti-Monólito):** Não crie CTEs amplos que realizam joins pesados para alimentar múltiplos indicadores se apenas uma das métricas precisa daquele cruzamento. Isole projeções e joins caros estritamente no CTE que calcula o indicador específico.

