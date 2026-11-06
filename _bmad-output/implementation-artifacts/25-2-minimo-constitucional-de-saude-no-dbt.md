---
status: ready-for-dev
---

# Story 25.2: Mínimo Constitucional de Saúde no dbt

Escopo e critérios de aceite: `planning-artifacts/epics.md`, Story 25.2 (Epic 25), já ajustada pela spike. Evidências, pareceres e tabelas: `planning-artifacts/spike-saude-fontes-indicadores.md` (arquivo local, não versionado). Este arquivo guarda só o contexto de execução.

## Decisões já tomadas (não reabrir)

- **Fonte:** SIOPS, indicador 3.2 (aplicação em saúde com recursos próprios sobre impostos e transferências constitucionais), mais 3.1 e 2.1 como indicadores de tela. O Siconfi não serve: a API do RREO não devolve o Anexo 12.
- **Anos fechados:** `POST` no TABNET (`SerHist/municipio/mIndicadores.def`), parâmetros em latin1, `formato=prn`. Baixa os 5.570 municípios e filtra pelos `cod_ibge` do `seed_portais` (Regra 23, nenhum literal). Decodificar entidades HTML do nome antes de separar por `;`.
- **Ano em andamento:** `POST` em `relindicadoresmun2.php`, só para os portais do seed. Valor rotulado `parcial` e **nunca comparado com o mínimo**. Houve 121,91% real em bimestre parcial: validar faixa 0 a 100.
- **Via oficial para 2.1 e 3.1:** consulta por ano (`relindicadoresmun2.php`). O TABNET serve ao 3.2 e aos valores absolutos. Divergência entre as vias é erro explícito (alerta), não escolha silenciosa. A spike achou 4 divergências em 78 valores.
- **"Não houve transmissão"** é sem dado: nulo, nunca zero.
- **Exibição (decisão do Julio):** o que está na fonte oficial é o que se exibe, sem depender de conferência de contador. Rótulo "calculado pelo SIOPS" e estágio da despesa citado. Isso é da 25.3; aqui o mart só precisa carregar os campos que permitem o rótulo e a data da última transmissão.
- **Cálculo próprio (dbt) é mart de conferência**, não fonte da tela. Usar o mapeamento de fontes STN em vez de texto livre e detalhar os códigos de receita da base por vigência.

## Critérios de aceite que a spike deixou para esta story

1. **Conciliação:** explicar a divergência de 2,6 pontos entre o cálculo próprio e o SIOPS 3.2 no município A em 2024 (SIOPS: receita R$ 65,75 mi e despesa com recursos próprios R$ 13,27 mi; proxy: R$ 68,53 mi e R$ 15,61 mi). A divergência vem das duas pontas. Conciliar código a código da receita e da fonte de recurso e registrar o resultado.
2. **Teste a partir do CI** (carga diária): NÃO foi executado na spike. Registrar timeouts, limite de taxa e repetição. Fonte em `http`, sem contrato de estabilidade.
3. **Teste de contrato do HTML:** página sem tabela, texto "Não houve transmissão", entidades HTML, latin1, faixa fora de 0 a 100 e linha repetida falham de forma explícita.
4. **Seed:** criar a linha `minimo_aplicacao_saude_municipal` (0,15) em `elt/transform/seeds/seed_constantes_fiscais.csv`, base LC 141/2012 art. 7º, com link oficial (Regra 20). A vigência da nova redação pela LC 227/2026 está **NÃO VERIFICADA**: registrar assim, pedir o parecer do `jurista-fiscal` e seguir `docs/governanca-constantes-fiscais.md`.

## Entregas esperadas

- Extrator em `elt/extract` no padrão de `siope.py` (User-Agent de navegador, uma requisição por vez, validação estrita) e carga em tabela raw por fonte, com `portal_slug` na chave quando a fonte for por município.
- Staging e mart `fct_saude_minimo_constitucional`, grão `portal_slug` e `ano`, colunas explícitas (Regra 9), ano em andamento identificável como parcial, limite vindo do seed, `portal_slug` em todo `JOIN` e `GROUP BY` (Regra 23).
- Mart de conferência do cálculo próprio com a diferença exposta.
- Testes: `make test` e `make check` (Python/dbt). Sem alteração de tela nem de `@transparencia/db` (25.3).

## Regras que valem

- Regra 15: execução só no Docker local (`localhost:5544`). **Nunca** exportar `DATABASE_URL` do 5544 junto de `db/test/build` ou `pnpm test` (apaga o banco local), e nunca rodar `elt/extract` contra produção.
- Regras 9, 10, 14, 23 e 27. Pareceres: `jurista-fiscal` (base legal), `contador-publico` (cálculo próprio e fontes STN), `dbt-transparencia` ao editar modelos e seeds.
- Commits convencionais em minúsculas, sem referência a story ou task (Regra 19). Não commitar sem pedir ao Julio.

## Fora do escopo

Tela e contratos TypeScript (25.3); divisão entre União e Estado (25.4); produção da rede (25.6); qualquer execução em produção.
