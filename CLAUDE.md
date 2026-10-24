# DIRETRIZES DE DESENVOLVIMENTO: EFICIÊNCIA DE TOKENS E QUALIDADE FISCAL

Este repositório possui limites estritos de consumo de tokens (Spend Cap). Todos os agentes que atuarem neste projeto devem seguir rigorosamente o seguinte protocolo de desenvolvimento econômico, buscando sempre o equilíbrio ideal entre **máxima eficiência de custo** e **máxima qualidade técnica**.

---

## 1. PRINCÍPIO DA ECONOMIA EXTREMA DE CONTEXTO

- **Buscas Cirúrgicas (Grep/Glob First):** Nunca leia arquivos inteiros para procurar termos ou entender a estrutura do código. Sempre use a ferramenta `Grep` com termos direcionados ou `Glob` com padrões de nomes antes de ler qualquer arquivo com a ferramenta `Read`.
- **Leitura Slicing / Janelamento:** Ao ler um arquivo grande com `Read`, use os parâmetros `limit` e `offset` para carregar estritamente a parte do código que será inspecionada ou modificada. Nunca leia mais de 100-200 linhas de uma vez se não for estritamente necessário.
- **Histórico Limpo:** Evite conversas longas e redundantes com o usuário. Seja conciso e direto nas respostas. Cada turno acumulado aumenta o custo exponencialmente a cada chamada subsequente da API.

---

## 2. ARQUITETURA BASEADA EM CAMADAS (DRY / CONTEXT CONSERVATION)

- **Camada de Dados / Queries (`packages/db`):** Toda a inteligência contábil, cálculos da LRF, queries Kysely e cruzamentos pertencem exclusivamente a `@transparencia/db/src/queries/`.
- **Programação Funcional e Imutabilidade (`packages/db`):** De preferência estrita para estilo funcional e transformações imutáveis (`.map`, `.reduce`, `.filter`, `Promise.all`) em vez de loops imperativos (`for..of`, `for`) com objetos/variáveis mutáveis.
- **A Camada de Apresentação é Burra:** Os componentes de visualização (`packages/ui` e `apps/web/app/`) devem apenas importar os dados tipados do `@transparencia/db` e renderizá-los.
- **Eficiência de Desenvolvimento:** Para alterar qualquer lógica ou corrigir anomalias fiscais nas telas web, modifique apenas a camada `@transparencia/db`. Isso evita a alteração desnecessária de componentes de página.


---

## 3. USO INTELIGENTE DE SUBAGENTES (CONTEXT TRUNCATION)

- **Minimização de histórico acumulado:** Quando enfrentar um problema complexo que exija múltiplos passos, não tente resolver tudo em um único chat de longos turnos.
- **Delegar para Subagentes (`Agent`):** Despache subagentes curtos e ultra-focados (via ferramenta `Agent`) com instruções exatas de pesquisa ou edição. Como cada subagente inicia com um contexto limpo e retorna apenas o resultado final para o agente pai, isso trunca o histórico do chat principal e poupa milhares de tokens em chamadas acumuladas subsequentes.

---

## 4. BASELINE DE QUALIDADE MANDATÓRIA

Não comprometa a estabilidade em nome da pressa. Após qualquer alteração:
1. **Backend & Modelos DBT (Python):** Sempre execute a suíte de testes de integração via `make test` e as validações estáticas/linters via `make check`.
2. **Frontend & queries Kysely (TypeScript):** Sempre execute a suíte de testes de paridade via `make test/ts` (ou `pnpm test`) e verifique a tipagem executando `pnpm typecheck` (ou `tsc --noEmit` nos pacotes correspondentes). O build de produção fica a cargo da integração da Vercel na PR.

---

## 7. GERENCIAMENTO DE DEPENDÊNCIAS (PINNED VERSIONS)

- **Versões Exatas (Pinned Versions):** Sempre instale e declare versões exatas de pacotes e dependências (npm/pnpm/pip) nos arquivos de manifesto (`package.json`, `pyproject.toml`, etc.), **sem** prefixos de variação como `^` ou `~` (ex: `"nuqs": "2.9.1"`). Ao rodar instalações via CLI, utilize flags de versão exata (ex: `pnpm add --save-exact <pacote>`).

---

---

## 9. NOMEAÇÃO CLARA DE MÉTRICAS (PROIBIDO NOME ABREVIADO)

- **Clareza Semântica:** É estritamente proibido criar colunas, DTOs ou variáveis com nomes de métricas abreviados ou opacos (ex: `c_valor`, `c_empenhado`, `df`, `do`, `pct`).
- **Nomes Explícitos:** Toda métrica deve ser nomeada de forma 100% clara e autoexplicativa em SQL e TypeScript (ex: `valor_contrato`, `empenhado_contrato`, `total_folha`, `total_pago`, `percentual_folha`).

---

## 10. PADRÃO DE VALORES FIXOS/CÓDIGOS EM LOWERCASE SNAKE_CASE

- **Códigos/Slugs em SQL:** É estritamente proibido utilizar strings fixas com formatação de exibição (ex: `'Adesão a ata (externa)'`, `'Sem licitação'`) em colunas de tabelas/marts SQL (como `modalidade`, `tipo_contratacao`, `status`).
- **Padrão Obrigatório:** Todos os valores fixos de códigos, categorias ou discriminadores devem ser armazenados em **lowercase snake_case** (ex: `'adesao_ata_externa'`, `'sem_licitacao'`, `'gap_licitacao'`, `'licitacao_propria'`).
- **Avanço da UI:** A camada de apresentação (`packages/ui` ou componentes web) é a única responsável por formatar e traduzir esses códigos em labels amigáveis para o usuário.

---

## 15. SEGURANÇA DE PRODUÇÃO: PROIBIÇÃO DE EXECUÇÃO EM BANCO DE PRODUÇÃO SEM PERMISSÃO EXPLÍCITA

- **Ambiente de Desenvolvimento Local Obrigatório:** Todos os comandos de execução (`make dbt/run`, `make dbt/test`, scripts Python, seeds e queries Kysely) devem rodar **estritamente contra o banco de dados local do Docker** (`DATABASE_URL=postgresql://postgres:postgres@localhost:5544/postgres` ou instâncias efêmeras de teste `testing.postgresql`).
- **Proibição Absoluta em Produção:** É **estritamente proibido** executar comandos de compilação, dbt run/build/seed ou DDL/DML diretamente contra bancos de dados de produção/remotos (como Supabase, AWS, poolers remotos ou qualquer DATABASE_URL de produção) **sem autorização prévia e explícita do usuário**.
- **Desenvolvimento e Testes Independentes:** Toda validação, desenvolvimento de modelos e testes automatizados devem ser concluídos e validados localmente antes de qualquer interação com ambientes remotos.

---

## 19. MENSAGENS DE COMMIT CONVENCIONAIS E SEM METADADOS DE PROCESSO (SEM STORY/TASK)

- **Proibição de Detalhes de Story/Task:** É estritamente proibido incluir referências a números de stories, tasks ou processos internos de gestão em mensagens de commit (ex: proibido `(story 9-4 task 3)`, `[story-9.4]`, `task 2`).
- **Padrão Obrigatório:** Utilizar estritamente Conventional Commits em minúsculas focado na mudança funcional ou técnica (ex: `feat(web): adicionar secao detalhada de saldo em caixa em receitas`, `fix(db): consolidar saldos de caixa por entidade`).

---

## 23. ISOLAMENTO MULTI-TENANT E PROIBIÇÃO DE LITERAIS DE TENANT (ZERO TENANT LEAKAGE)

- **Proibição de Slugs/Tenants Hard-Coded:** É **estritamente proibido** utilizar literais de municípios ou portais (como `'porciuncula_prefeitura'`, `'natividade_prefeitura'`, etc.) de forma hard-coded em projeções analíticas, CTEs intermediárias, cálculos de surrogate keys (`dbt_utils.generate_surrogate_key`), cláusulas `WHERE` ou fallbacks de `COALESCE` em modelos marts (`models/marts/`) e métricas (`models/marts/metrics/`). A única exceção admitida são os modelos de união de fontes/staging ou seeds (`int_*_consolidadas.sql`), onde as tabelas de origem distintas recebem sua respectiva tag de tenant para consolidação inicial.
- **Proibição de Estados/UFs e Médias Regionais Hard-Coded:** É **estritamente proibido** declarar literais de estados ou UFs (como `'RJ'`, `'SP'`, `'MG'`), nomes estáticos em legendas (ex: proibido `'Média RJ'`), ou constantes/dicionários de médias estaduais ou nacionais no TypeScript (ex: proibido `MEDIA_ESTADUAL_RJ`, `constantesEstaduais`). Toda métrica agregada territorial (médias estaduais, rankings regionais, totais da UF) deve ser **calculada dinamicamente** pela camada de dados (`@transparencia/db` / dbt) baseada no `cod_ibge` do município ou recebida como parâmetro dinâmico. O label deve ser sempre dinâmico (ex: `Média ${municipioUf}` ou `'Média Estadual'`).
- **Proibição de Hard-Coding Temporal em Títulos e Séries Históricas:** É expressamente proibido chumbar anos ou intervalos de datas fixos em títulos de seções, cabeçalhos ou labels visuais (ex: proibido `title="... (2021–2025)"` ou fallbacks de ano fixo `2025`). Os intervalos temporais exibidos devem ser **computados dinamicamente** a partir dos pontos reais do histórico (`${anoMin}–${anoMax}`) ou dos parâmetros ativos do contexto.
- **Proibição Absoluta no Frontend e Componentes (`apps/web`, `packages/ui`):** É expressamente proibido declarar listas, arrays ou objetos hard-coded de municípios/tenants como fallbacks padrão em componentes, templates de página, cards de OpenGraph ou hooks (ex: proibido `DEFAULT_CITIES`, listas fixas de cidades ou slugs como fallback de props). Todos os dados de municípios devem ser obtidos dinamicamente da camada de dados (`@transparencia/db`) via queries/loaders (`getAllPortais()`). Quando a lista recebida for vazia, o estado renderizado deve ser estritamente neutro e genérico (ex: `"Municípios Integrados"`, ícone cívico neutro), sem assumir nenhuma prefeitura específica.
- **Isolamento Mandatório em Joins (Anti Cross-Tenant):** Todo cruzamento (`JOIN` / `LEFT JOIN`) entre tabelas ou CTEs analíticas que contenham o atributo `portal_slug` deve **obrigatoriamente** incluir o predicado de tenant: `ON a.portal_slug = b.portal_slug AND a.outra_chave = b.outra_chave`. É expressamente proibido cruzar apenas por entidades secundárias (`empresa_id`, `ano`, `fornecedor_codigo`), sob pena de provocar vazamento e contaminação de dados (*tenant leakage*) entre prefeituras com os mesmos códigos internos.
- **Preservação de `portal_slug` em Agrupamentos:** Toda agregação (`GROUP BY`) em modelos marts ou métricas derivadas deve incluir `portal_slug` no grão de particionamento, garantindo que nenhum indicador misture ou unifique métricas de municípios distintos.
- **Fallbacks e Defaults Neutros:** Nunca defina fallbacks com nomes ou cidades fixas de um tenant específico (ex: proibido `coalesce(cidade, 'PORCIUNCULA')` ou `coalesce(portal_slug, 'porciuncula_prefeitura')` ou `uf ?? 'RJ'`). Utilize sempre condicionais dinâmicas baseadas no próprio `portal_slug` ou valores nulos/neutros (`'OUTROS'`, `'NAO_INFORMADO'`, `''`).
- **Checklist de Code Review Multi-Tenant & Agnóstico:** Todo reviewer ou agente ao auditar código deve responder: *"Se este portal pertencer a outro estado da federação (ex: MG, SP) e o histórico temporal iniciar em 2017 ou terminar em 2027, este componente ou query continuará funcionando com fidelidade e sem exibir dados trocados?"*. Se a resposta for não, a alteração deve ser rejeitada imediatamente.

---

## REGRAS POR ESCOPO

As regras 5, 6, 11, 16, 21 e 22 (dbt/SQL), 13, 14 e 18 (TypeScript) e 12, 17, 20 e 24 (web/UI) vivem em `.claude/rules/` e carregam automaticamente ao editar os arquivos correspondentes.

---

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
