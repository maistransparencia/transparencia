---
status: done
baseline_commit: 06daca1628bdcb7accf104093dd383c04de455d1
---

# Story 25.4: Quanto a União e o Estado Repassam ao Fundo Municipal de Saúde

Critérios de aceite completos: `planning-artifacts/epics.md`, Story 25.4 (Epic 25). Este arquivo guarda só o contexto de execução.

## Pergunta do cidadão (Regra 27)

"Quanto a União e o Estado repassam ao Fundo Municipal de Saúde?" A receita do fundo **não inclui** os recursos próprios da Prefeitura; o aviso fixo no bloco diz isso. Sem estimativa, sem SIOPS 3.1 na tela (decisão do Julio, 2026-11-06).

## Padrão a seguir

- dbt: `elt/transform/models/marts/metrics/fct_educacao_origem_recursos_metricas.sql` e seu `.yml` (folhas do plano de contas, `totais_oficiais`, `nao_detalhado`, contrato enforced, `accepted_values`).
- Query: `packages/db/src/queries/educacao-origem-recursos.ts` (DTOs camelCase, ano parcial via `dim_metadata.last_extracted_at`).
- Tela: hero e blocos de `/educacao` (Story 24.12 em `epics.md`); `DESIGN.md` e `EXPERIENCE.md` lidos antes (Regra 25).
- Skill de dbt: `dbt-transparencia`.

## O que a consulta ao banco local mostrou (Porciúncula, `empresa_id` 2)

- Órgão: `FUNDO MUNICIPAL DE SAUDE` (Natividade: `FUNDO MUNICIPAL DE SAÚDE`, com acento). Filtro: `unaccent(orgao_nome) ilike '%saude%'`; a extensão `unaccent` já existe no banco.
- Receita do fundo 2024: R$ 20,47 mi (União SUS R$ 18,64 mi, capital da União R$ 0,35 mi, Estado R$ 1,09 mi, resto rendimento e devoluções). 2023: R$ 16,93 mi de correntes.
- Esfera pela natureza: `1710`/`1713` e `2410`/`2411` União; `1720`/`1723` Estado. O `codigo_fonte_stn` (1600, 1601, 1621, 1605...) **não** diz a esfera sozinho: a fonte 1621 aparece em naturezas `1713` (União) e `1723` (Estado). Decidir pela natureza.
- A tabela traz linhas em todos os níveis (pai e folha, algumas com `codigo_fonte_stn` nulo): usar só folhas, como na educação.
- Tabela de naturezas anterior a 2022 pode diferir (como na educação: 1758.01, 1718.x). Verificar com dados de anos anteriores antes de fechar os prefixos.
- O SIOPS 3.1 (`percentual_transferencias_saude` × `despesa_total_saude`) deu R$ 12,98 mi em 2023 e R$ 16,50 mi em 2024; a União SUS no portal foi R$ 12,91 mi e R$ 18,64 mi. Diferença sem causa provada, registrar em pendências.

## Fora do escopo

Estimativa da parcela da Prefeitura; SIOPS 3.1 na tela; Fundo Nacional de Saúde; emendas (25.5); posição final do bloco na página (25.10).

## Regras que valem

- Regra 15: só Docker local (`localhost:5544`). **Nunca** exportar `DATABASE_URL` do 5544 junto de `db/test/build` ou `pnpm test` (apaga o banco local).
- Regras 2, 9, 10, 20, 23, 25 e 27. Skills de apoio: `contador-publico` (naturezas e esferas), `jurista-fiscal` (base legal), `editor-cidadao` (textos).
- Após alterar: `make test` e `make check` (dbt), `make test/ts` e `pnpm typecheck` (TypeScript).
- Commits convencionais em minúsculas, sem referência a story (Regra 19). Não commitar sem pedir ao Julio.

## Resultado

- dbt: `fct_saude_origem_recursos_metricas` (esfera pelo prefixo da natureza e pelo total da categoria 171, 172, 241, 242; diferença das folhas em `sem_detalhe_<categoria>`; resíduo contra o total oficial em `nao_detalhado`). `fct_historia_saude_metricas` passou a ler União e Estado desse mart.
- Query `getSaudeOrigemRecursos` (com `anoInicial`) e seed de teste; ainda sem uso na tela. A seção "O que entrou" de `/saude` ficou como bloco único, com a fonte e o link do portal da Prefeitura. O bloco separado da 25.4 saiu da página; a série por ano fica para a 25.10.
- Conferido contra CSVs do portal: Porciúncula 2021 (R$ 8.454.710,76), Natividade 2021 (R$ 22.668.316,69), Natividade 2026 (1719 igual; 1713 R$ 1,34 mi abaixo por coleta anterior) e "Transferências do Estado" de Natividade 2022 a 2025 (zero, igual ao banco).

## Pendências

- Natividade lança como federal (1713) repasses com cara de estaduais (resoluções da SES, PREFAPS, PAHI, fonte 1621). Esfera segue a natureza, como o portal exibe; sem aviso na tela; o link do portal fica na fonte. Porciúncula 2024: R$ 1,38 mi na mesma situação. Validar com o `contador-publico`.
- Diferença SIOPS 3.1 de 2024 sem causa provada (a de 2023 era do modelo antigo).
- Identificação do órgão por nome é heurística.
- Textos da tela ainda sem passagem do `editor-cidadao`.
- 1713 de Natividade 2026 abaixo do portal até a próxima coleta.

### Review Findings

- [x] [Review][Decision] (resolvida: descartar com aviso) Valor negativo no mart e na query: `sem_detalhe_<categoria>` mantém diferença negativa (`abs(...) > 0.01`), o resíduo `nao_detalhado` descarta negativa (`> 0.01`) e `getSaudeOrigemRecursos` descarta fonte com total <= 0 (`.filter(total > 0)`), enquanto `composicao` mantém `!== 0`. Total menor que a soma das folhas some sem aviso e os percentuais deixam de refletir o mart. Decidir: mostrar, sinalizar ou descartar com aviso.
- [x] [Review][Decision] (resolvida: nulo em vez de zero) `fct_historia_saude_metricas` usa `coalesce(receita_uniao, 0)` e `coalesce(receita_estado, 0)` e parte de `receitas_orcamentarias_saude` (left join): anos anteriores a 2021 passam a mostrar 0 (antes tinham valor) e ano só presente no mart novo some. Decidir: nulo em vez de zero ("nunca zero") e/ou full join.
- [x] [Review][Decision] (resolvida: adiada para a 25.10) Regra 27: União/Estado agora incluem valor por diferença (`sem_detalhe_<categoria>`, `nao_detalhado`) e a tela não diz que é derivado. Decidir onde e com que texto (passar pelo `editor-cidadao`).
- [x] [Review][Patch] `accepted_values` de `grupo_fonte` copiado da educação; o mart emite `uniao`, `estado`, `outras_receitas`, `nao_detalhado` [elt/transform/models/marts/metrics/_fct_saude_origem_recursos_metricas.yml:58]
- [x] [Review][Patch] `getSaudeOrigemRecursos` retorna DTO com `fontes: []` e `totalArrecadado: 0` quando há linhas em outros anos mas não em `ano`; deve retornar `null` [packages/db/src/queries/saude-origem-recursos.ts:171]
- [x] [Review][Patch] `nomeOrgao` devolve `""` em vez de `null` sem nomes e é montado com linhas anteriores a `anoInicial` [packages/db/src/queries/saude-origem-recursos.ts:210]
- [x] [Review][Patch] `llms.txt` e `llms-full.txt` afirmam "sem cálculo por diferença" para "O que entrou", mas o mart deriva `sem_detalhe_*` e `nao_detalhado` por diferença [apps/web/public/llms.txt:45]
- [x] [Review][Patch] `text-sm` adicionado ao `dd` do mínimo, fora do escopo e contra "elemento nu primeiro" (Regra 25) [apps/web/components/saude/saude-minimo-destaque.tsx]
- [x] [Review][Patch] Detecção de folha por `rtrim(codigo,'0.')` tratava `1713.50.1.1.10.00` como pai de `…11.00`…`…19.00`: 331 folhas reais fora da detecção nos dados locais. Corrigido com `prefixo_hierarquia` por segmentos, teste de regressão em `test_fct_saude_origem_recursos_metricas.py` [fct_saude_origem_recursos_metricas.sql]
- [x] [Review][Patch] Dupla contagem de 1720 vs 1723.50 não ocorre: no banco local, União e Estado do mart igualam o total das categorias 171/172/241/242 em todos os anos e portais (0 diferenças). Comparação com a regra antiga: 2022 a 2025 idênticos; Natividade 2026 sobe de 17,1 mi para 31,5 mi (a regra antiga ignorava 1719 e o restante da 1710) e Natividade 2021 deixa de ser zero. Achado novo: anos anteriores a 2021 usam 1721 para a União e 1722 para o Estado (o oposto do prefixo 172x) e apareciam como Estado em Porciúncula 2017; mart passa a filtrar `ano >= 2021`, com teste
- [x] [Review][Defer] Identificação do órgão por nome (`like '%saude%'`) sem teste dbt de ausência — deferred: já listada em Pendências
- [x] [Review][Defer] Textos da tela sem `editor-cidadao`, sem revisão de `contador-publico` e `jurista-fiscal` das naturezas — deferred: já listado em Pendências
- [x] [Review][Patch] `LeiLink` e `LinhaLeiEFonte` movidos para `apps/web/components/lei-e-fonte.tsx`; importadores de educação e saúde atualizados

#### Rejected

- AC5 (bloco em /saude), AC6 (ano parcial na tela): decisão do Julio, bloco saiu da página e a série fica para a 25.10; corrigir exigiria editar a story.
- Aviso na tela sobre repasse estadual lançado como federal: decisão do Julio (esfera pela natureza, sem aviso).
- Status `in-review` x `review`: o passo 6 do workflow define o status.
- `portalUrl` sem validar de esquema: vem de configuração própria, não de entrada do usuário.
- Filtro de `anoInicial` em JS, `grupo_fonte` sem checagem, filtro `unaccent` diferente do texto da story, `codigo_natureza` sintético sem teste: sem dano concreto, correção só acrescentaria código.
- Falta de teste de `portalUrl` vazio, comentário de teste fora do lugar, helpers repetidos, `dataColeta` duplicada, falta de CHANGELOG, índice no anti-join: baixa chance de afetar alguém.
- Tipos Kysely do mart novo: `pnpm typecheck` passou na implementação.

#### Aplicado na revisão

- Negativos: `sem_detalhe_<categoria>` só quando positivo; teste dbt `assert_saude_origem_recursos_fecha_total` (severity warn) avisa quando o mart não fecha com o total oficial.
- Histórico: `receita_uniao_saude`, `receita_estado_saude`, `receita_outras_saude`, `total_entrada_saude` e percentuais ficam nulos em ano sem dado no mart de origem (tela cai no estado vazio); contratos `not_null` retirados dessas colunas.
- Verificado: `make check`, pytest (349+), `@transparencia/db`, web, ui, `pnpm lint`, `pnpm typecheck`, banco de teste na porta 5545.
