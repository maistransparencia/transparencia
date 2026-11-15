# Story 15.6: Desacoplamento de Nomes Hardcoded de Previdência no dbt via `dim_portais`

Status: ready-for-dev

## Contexto & Motivação
Atualmente, os modelos analíticos de previdência:
- `elt/transform/models/marts/metrics/fct_previdencia_cadprev_metricas.sql`
- `elt/transform/models/marts/metrics/fct_previdencia_historia_metricas.sql`

possuem filtros com siglas e nomes hard-coded (`'%CAPREM%'`, `'%NATPREVI%'`, `'%IPAMN%'`, `'%FUNPREV%'`). Isso é frágil, viola a governança analítica e exige modificar modelos SQL a cada novo município adicionado à plataforma.

Como comprovado pela auditoria no banco PostgreSQL local:
1. No **Elemento 13 (Obrigações Patronais)**, é indispensável filtrar o instituto municipal para não inflar a previdência local com o INSS federal (R$ 8M em Natividade e R$ 12M em Porciúncula).
2. No **Elemento 71 (Amortização da Dívida / CADPREV)**, Natividade possui R$ 11.1M para a NATPREVI e a palavra `"CADPREV"` não existe na descrição dos empenhos (`tem_cadprev_desc = false`). O filtro pelo instituto é indispensável para excluir R$ 3.38M de amortizações federais do INSS.
3. No **Elemento 97 (Aporte Atuarial)**, 100% dos empenhos já são destinados exclusivamente ao RPPS da cidade, dispensando filtros textuais.

A tabela dimensional de semente `elt/transform/seeds/dim_portais.csv` (e o mart `dim_portais.sql`) já centraliza a configuração obrigatória de todos os portais municipais, incluindo `previdencia_habilitado`, `previdencia_sigla` e `previdencia_nome`.

## Critérios de Aceitação

1. **Enriquecimento de `dim_portais` com CNPJ da Previdência:**
   - Adicionar a coluna `previdencia_cnpj` em `elt/transform/seeds/dim_portais.csv`:
     - `porciuncula_prefeitura`: `01180031000134` (CAPREM)
     - `natividade_prefeitura`: `01709035000167` (NATPREVI)
   - Atualizar a projeção e documentação em `elt/transform/models/marts/core/dim_portais.sql` e `_dim_portais.yml`.

2. **Refatoração de `fct_previdencia_cadprev_metricas.sql`:**
   - Realizar `join {{ ref('dim_portais') }} p on d.portal_slug = p.portal_slug`.
   - Substituir as condições hard-coded por:
     ```sql
     where
         d.elemento = '71'
         and p.previdencia_habilitado = true
         and (
             lower(unaccent(d.fornecedor_nome)) ilike '%' || lower(unaccent(p.previdencia_sigla)) || '%'
             or regexp_replace(d.fornecedor_cpf_cnpj, '[^0-9]', '', 'g') = p.previdencia_cnpj
             or lower(unaccent(d.fornecedor_nome)) ilike '%rpps%'
             or lower(unaccent(d.descricao)) ilike '%cadprev%'
         )
         and (d.tipo_empenho is null or d.tipo_empenho != 'AN')
     ```

3. **Refatoração de `fct_previdencia_historia_metricas.sql`:**
   - Eliminar os blocos repetitivos com `CAPREM`, `NATPREVI`, `IPAMN`, `FUNPREV`.
   - Realizar join/cruzamento com `dim_portais` filtrando dinamicamente por `p.previdencia_sigla` e `p.previdencia_cnpj`.
   - Manter o Elemento 97 simples e transparente (`when d.elemento = '97'`).

4. **Verificação de Paridade de Dados:**
   - As métricas calculadas para Porciúncula e Natividade devem permanecer 100% idênticas às atuais (R$ 35.02M CAPREM / R$ 63.78M NATPREVI patronal liquidado/pago, e amortizações de dívida).

5. **Governança de Fixtures e Qualidade:**
   - Executar `make test` e `make test/ts`.
   - Regerar `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e checar com `make db/fixture/check` (Regra 21 do AGENTS.md).

6. **Landing Page Cívica de Seleção de Município na Rota Raiz (`/`):**
   - Substituir o redirecionamento incondicional de `apps/web/app/page.tsx` para `/porciuncula_prefeitura` por um fluxo inteligente baseado em `localStorage`:
     - **Usuário Recorrente (com preferência):** Se `localStorage.getItem("preferred_portal")` estiver definido e for um slug válido, redireciona imediatamente para `/${preferred_portal}`.
     - **Usuário Legado:** Se existirem marcadores prévios de visitação no `localStorage` (como `last_seen_extraction`, `pwa_dismissed`, `pwa_installed`, `push_prompt_dismissed_at`), identifica como usuário histórico de Porciúncula -> salva `preferred_portal = 'porciuncula_prefeitura'` e redireciona para `/porciuncula_prefeitura`.
     - **Novo Visitante (Primeiro Acesso em `https://maistransparencia.com`):** Exibe a página inicial cívica com apresentação da plataforma e cartões visuais para escolha da cidade (Porciúncula e Natividade), com seus respectivos brasões oficiais em SVG, UF e descrição.
     - **Persistência da Escolha:** Ao clicar na cidade, grava `localStorage.setItem("preferred_portal", slug)` e navega para o portal escolhido.
     - **Atualização Contínua:** Ao navegar diretamente entre portais via seletor do header, a chave `preferred_portal` é mantida em sincronia.
   - Adicionar testes em `apps/web/app/page.spec.tsx` cobrindo os 3 comportamentos (novo visitante, usuário legado e usuário com portal persistido).

