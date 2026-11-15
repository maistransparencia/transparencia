# Epic 19 Context: Remodelagem da Homepage para Utilidade Pública, Sentinela da Farmácia SUS (Lei 14.654/2023) e Ação Cívica

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Transformar a página inicial do portal, hoje de viés contábil, em utilidade pública para o cidadão comum. A primeira dobra prioriza serviços e direitos essenciais: consulta de estoque de remédios da Farmácia SUS, sentinela de conformidade da Lei 14.654/2023, troféu cívico da Educação e alerta de obras paralisadas. O cidadão ganha utilidade direta (saber em qual unidade há o remédio) e ação imediata (copiar requerimento formal, compartilhar no WhatsApp quando há omissão de dados). A inteligência orçamentária fica como base de sustentação.

## Stories

- Story 19.1: Pipeline ELT da Farmácia SUS (estoque BNAFAR/Hórus e CNES)
- Story 19.2: Página da Farmácia SUS, camada de dados e card-resumo na home
- Story 19.3: Reorganização da arquitetura da homepage (sentinela cívica e troféus)
- Story 19.4: Ação cívica no card da Farmácia na home
- Story 19.7: Sincronização da home em `llms.txt` e acessibilidade mobile
- Story 19.8: Histórico de estoque da Farmácia SUS (snapshots diários e coletas)
- Story 19.9: Medicamentos-sentinela: disponibilidade por unidade sob a busca
- Story 19.11: Redesenho do conteúdo da página da Farmácia SUS (busca em destaque, resultados com mapa, essenciais)
- Story 19.10: Página dedicada `/[portalSlug]/farmacia` com estatísticas e ação por medicamento
- Story 19.12: Download do estoque completo da Farmácia SUS em CSV
- Story 19.5 (opcional): Entrada por tema na raiz (`/farmacia`) com seletor de cidade
- Story 19.6 (opcional): Atalho "Remédios" no topbar mobile

## Requirements & Constraints

- Ordem da home: header do município, dobra de sentinela (card-resumo da Farmácia, `EducacaoTrofeuCard`, `ObrasParalisadasAlertaCard`), radar cívico por severidade e impacto, painel fiscal resumido. Sem seção de trilhas temáticas.
- Estados da Farmácia: `conforme` (busca e selo de atualização), `apagao` (sentinela, requerimento e WhatsApp), `indisponivel` (mensagem neutra; na home, nada). Falha de coleta nunca vira apagão nem induz ação.
- Busca começa vazia, agrupa por unidade, pagina, filtra por unidade e aceita deep link (`?q=...&unidade=...`); mapa só com unidades com coordenadas.
- Requerimento cita "Art. 6º-A da Lei nº 8.080/1990, incluído pela Lei nº 14.654/2023" e fala em "possível descumprimento". O gatilho de 15 dias é parâmetro do portal, não prazo legal. Links legais com `target="_blank"` e `rel="noopener noreferrer"`.
- Linguagem de indício, nunca acusação: sem "apagão", "esgotado" ou "zerado" na UI. Usar "sem informação de estoque" / "sem registro de estoque informado". A fonte só publica itens com saldo e não traz saídas, então não há ranking de demanda.
- Navegação: na sidebar, "Temas" antes de "Administrativo"; bottom bar com Início, Saúde, Educação, Obras e "Mais", alvos ≥ 44 px com `aria-label`, lista de temas de fonte única. Remover o fallback de brasão fixo em `sidebar.tsx` (ícone neutro).
- Lighthouse mobile 100% em Acessibilidade e SEO. Helpers canônicos de formatação. `llms.txt` e `llms-full.txt` atualizados a cada rota nova (Regra 12).
- Sem município, UF ou ano fixos, nem listas de cidades hard-coded (Regra 23).
- Fechamento: `make check`, `make test`, `make test/ts`, `make db/fixture/check`, `pnpm build`, `tsc --noEmit`.

## Technical Decisions

- ELT: `elt/extract/farmacia_sus.py` pagina as APIs do Ministério da Saúde por IBGE de 6 dígitos (CNES deduplicado por `nu_comp`); `elt/load/farmacia_sus.py` grava em `raw_farmacia_sus` (`estoque_medicamentos`, `estabelecimentos_cnes`, `coletas`) com `portal_slug` na PK. Roda no `ingestion-pipeline.yml` global e via `make elt/farmacia-sus [PORTAL=...]`.
- Mart `fct_farmacia_estoque`: `conforme` / `apagao` (0 itens ou posição > 15 dias, por CNES) / `indisponivel`; coordenadas das unidades. Contrato deve permanecer estável.
- Histórico (19.8): estoque append-only e idempotente, chave `(portal_slug, id_registro, data_posicao_estoque)`, com `sigla_sistema_origem`; `coletas` acumula uma linha por execução; modelo incremental `fct_farmacia_estoque_historico` e visão de coletas. Executar antes da coleta diária em produção; o historico expõe `data_validade`.
- Sentinelas (19.9): seed `seed_farmacia_medicamentos_sentinela` (`column_types` text, Regra 16; lista editorial RENAME 2024 em `handoff-sentinelas-farmacia-sus.md`) e mart `fct_farmacia_sentinela_disponibilidade` (contrato enforced, grão portal × CNES × princípio ativo). Casamento com `{{ target.schema }}.unaccent(lower(...))` e regex de prefixo, excluindo combinações em dose fixa (`+`, "associada") e insulinas análogas. Denominador: unidades ativas do mart. Não somar quantidades entre apresentações. Todo JOIN/GROUP BY com `portal_slug`.
- Camada de dados: queries em `@transparencia/db/src/queries/farmacia.ts` (`getFarmaciaSus`, `getFarmaciaSentinelas`), somente leitura de marts, DTOs camelCase; estatísticas da 19.10 calculadas aí. A UI é burra e rótulos vêm de códigos snake_case (Regra 10). Home via `loadVisaoGeralData` com `Promise.all`.
- Reuso: mini-mapa de Obras (Epic 17), `EducacaoTrofeuCard` (Epic 18), `FarmaciaResumoCard` e o trecho compartilhado de ações extraído de `farmacia-sus-sentinela-banner.tsx` (sem duplicar clipboard, requerimento nem link WhatsApp).
- Fechamento da epic (exige autorização explícita, Regra 15, antes da coleta diária em produção): migração de PKs de `raw_farmacia_sus` com limpeza de linhas legadas de data inválida, `dbt run --full-refresh` em `fct_farmacia_estoque_historico` (`on_schema_change='fail'` por `data_validade`) e só então iniciar a coleta diária.
- Mecanismo tema + cidade (19.5, opcional): genérico, municípios via `getAllPortais()`, grava `preferred_portal`, não confunde tema com `portalSlug`.

## UX & Interaction Patterns

- Redesenho (19.11, executa antes da 19.10, rota ainda `/saude/farmacia`): só a área de conteúdo, seguindo `planning-artifacts/design_handoff_farmacia_sus/` (cabeçalho com busca em destaque e chips, 3 indicadores, "Onde encontrar" por unidade/remédio com mapa Leaflet + Esri como em Obras, "Remédios essenciais" com filtro de categoria). Protótipo traz dados placeholders; usar dados reais e tokens de `packages/ui/src/tokens.ts`. Eyebrow mantém "Saúde"; chips pelo critério da 19.9; selo da Lei 14.654 mantido.
- Página da Farmácia, em ordem (19.10): busca, estatísticas de estoque (unidades que informaram, itens com saldo, última atualização, lotes próximos do vencimento se houver validade), sentinelas agrupados por `grupo_terapeutico` (só em `conforme`; clique leva a `?q=`), sentinela de conformidade. Texto "N de M unidades que informaram estoque", com nota sobre a lista RENAME e a fonte.
- Cada sentinela em `sem_registro_estoque` tem botão para copiar/compartilhar pedido de esclarecimento sobre o medicamento.
- Texto revisado pelo `editor-cidadao`. Base legal do pedido já verificada pelo `jurista-fiscal` no texto oficial (arts. 10 e 11 da Lei 12.527/2011 e art. 6º-A da Lei 8.080/1990, incluído pela Lei 14.654/2023; texto-base no epic): o pedido nunca afirma falta do remédio nem descumprimento. Componentes do design system (Regra 24).
- Sidebar (19.10): item solto "Farmácia SUS" (fora de qualquer grupo) logo abaixo de "Radar Cívico", em `packages/ui/src/components/sidebar.tsx`; critério de teste da story é `make test/ts` e `tsc --noEmit`, sem `pnpm build`.

## Cross-Story Dependencies

- 19.2 depende do mart da 19.1; 19.3 consome o card da 19.2 e dados das Epics 17 e 18; 19.4 estende o `FarmaciaResumoCard` e revoga a restrição "somente nesta rota" da 19.2.
- 19.9 depende de 19.1 e 19.2 e independe da 19.8; 19.11 depende de 19.8 e 19.9 e bloqueia a 19.10; 19.10 depende de 19.8, 19.9 e 19.11 e move a rota `/saude/farmacia` para `/farmacia` sem redirect, atualizando todas as referências (home, requerimento, WhatsApp, navegação, `llms*.txt`, metadados, testes).
- 19.7 consolida a documentação das demais. 19.6 depende da 19.5; ambas só serão decididas após a 19.10.
