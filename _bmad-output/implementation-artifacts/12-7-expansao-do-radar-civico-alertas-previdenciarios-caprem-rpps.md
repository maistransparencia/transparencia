---
baseline_commit: 9f7cf3139c530672425744ebcafe6ba2b6cefd48
---

# Story 12.7: Expansão do Radar Cívico: Detecção de Anomalias Previdenciárias (CAPREM / RPPS)

Status: done

## Story

As a citizen, civil servant, or municipal fiscal auditor,  
I want the civic radar engine (`fct_anomalias_fiscais_metricas`) to detect severe pension system liabilities (actuarial contribution defaults on Element 97 and unremitted employer contributions on Element 13),  
So that unconstitutional pension defaults and structural actuarial risks are proactively identified, explained with official legal foundations, and deep-linked into the dedicated CAPREM portal.

---

## Acceptance Criteria

1. **Modelagem dbt (`fct_anomalias_fiscais_metricas.sql`):**
   - Integrar as fontes analíticas consolidadas do domínio previdenciário municipal (`fct_caprem_tendencia_atuarial_metricas` e `fct_historia_caprem_metricas`).
   - Implementar novas anomalias padronizadas em `lowercase snake_case`:
     - `inadimplencia_aporte_rpps`: detecção de inadimplência no aporte atuarial de cobertura de déficit (Elemento 97), quando `aporte_exigido > 0` e a taxa de adimplência for inferior a 90% (severidade `alto`) ou inferior a 70% (severidade `critico`).
     - `retencao_patronal_rpps`: detecção de retenção de cota patronal previdenciária não repassada ao RPPS (`rombo_patronal_nao_repassado` no Elemento 13 > 0 e valor absoluto > R$ 20.000,00), categorizada com severidade `critico`.
   - Dimensionar referências (`dimensao_referencia` = `aporte_atuarial` e `contribuicao_patronal`).
   - Estabelecer `deep_link_rota` canônicos contextuais com âncoras para a página do CAPREM (`/[portalSlug]/caprem?ano=[ano]#atuarial` e `/[portalSlug]/caprem?ano=[ano]#patronal`).
   - Padronizar métodos de detecção (`limite_normativo_adimplencia` e `fluxo_patronal_em_aberto`).

2. **Documentação e Testes dbt (`elt/transform/models/marts/metrics/_fct_anomalias_fiscais_metricas.yml`):**
   - Atualizar testes de valores aceitos (`accepted_values`) para `tipo_anomalia` e `dimensao_referencia`.
   - Adicionar unit tests para as novas anomalias previdenciárias.

3. **Camada de Acesso a Dados Kysely (`@transparencia/db`):**
   - Atualizar o union type `TipoAnomalia` em `packages/db/src/queries/radar-civico-alertas.ts` incluindo `"inadimplencia_aporte_rpps"` e `"retencao_patronal_rpps"`.
   - Garantir preservação das âncoras `#atuarial` e `#patronal` no helper de enriquecimento de deep links.
   - Atualizar e expandir testes unitários em `packages/db/src/queries/__tests__/radar-civico-alertas.spec.ts`.

4. **Governança de Fixtures e CI/CD (Regra 21 do AGENTS.md):**
   - Regerar fixture compactada com `make db/fixture/dump`.
   - Validar paridade e ausência de regressões com `make db/fixture/check` e `make test`.

5. **Camada de Apresentação e UX (`apps/web`):**
   - No `view-model.tsx` e componentes do Radar, mapear títulos objetivos, badges e descrições estritamente factuais e não-acusatórias (ex: *"Taxa de adimplência do aporte atuarial de 65% em relação ao fixado em lei municipal"*).
   - Incluir hyperlinks oficiais obrigatórios para a fundamentação jurídica ([Art. 40 da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40) e [Lei Federal nº 9.717/1998](https://www.planalto.gov.br/ccivil_03/leis/l9717.htm)) em conformidade com a Regra 20 do AGENTS.md.
   - Sincronizar os guias de consumo por IA (`apps/web/public/llms.txt` e `apps/web/public/llms-full.txt`) conforme a Regra 12 do AGENTS.md.

---

## Candidatos a Alertas Cívicos de Aquisições e Itens Licitados (Sob Análise / Opcionais)

> [!NOTE]
> **Escopo em Avaliação (Sob Análise):**
> Os alertas abaixo aproveitam os dados de itens e resultados de disputa introduzidos na Story 12.8 (`fct_licitacoes_itens`). Eles estão registrados nesta story como **candidatos analíticos**. Nem todos serão necessariamente ativados simultaneamente; a seleção e parametrização final de quais regras entrarão no motor `fct_anomalias_fiscais_metricas` serão definidas durante o refinamento técnico antes do desenvolvimento.

1. **Pregão sem Disputa Real / Desconto Nulo (`desconto_nulo_pregao`):**
   - **Gatilho:** Itens ou lotes homologados em pregão eletrônico com desconto percentual nulo (0,00%) ou irrisório (< 1,00%) em relação ao valor de referência estimado.
   - **Severidade Sugerida:** `alto` (para valores homologados > R$ 100.000,00) ou `moderado`.
   - **Fundamentação Legal:** [Art. 5º da Lei Federal nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art5) (princípios da competitividade, economicidade e obtenção da proposta mais vantajosa).
   - **Deep Link / Ação:** Link direto para a visualização da licitação e, quando disponível via PNCP, botão de auditoria apontando para a sala de lances pública (`linkSistemaOrigem` - Licitanet).

2. **Disparidade de Preço do Mesmo Item (`disparidade_preco_item`):**
   - **Gatilho:** Dispersão estatística expressiva (> 40%) no preço unitário homologado de um mesmo insumo/item padronizado entre certames distintos no mesmo exercício (ex: combustíveis, medicamentos de referência, gêneros de merenda escolar, papelaria).
   - **Severidade Sugerida:** `alto`.
   - **Fundamentação Legal:** [Art. 23 da Lei Federal nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art23) (parâmetros da pesquisa de preços e compatibilidade com valores de mercado).
   - **Deep Link:** `/[portalSlug]/licitacoes?busca=[termoItem]#itens`.

3. **Concentração de Fornecedor / "Vencedor Leva Tudo" (`concentracao_itens_fornecedor`):**
   - **Gatilho:** Uma única pessoa jurídica adjudica fatia desproporcional (ex: > 80%) dos lotes/itens em certames multifacetados de grande porte, ou concentra vitórias em sucessivas contratações de uma mesma secretaria.
   - **Severidade Sugerida:** `alto`.
   - **Fundamentação Legal:** [Art. 40, § 3º da Lei Federal nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art40p3) (obrigatoriedade de parcelamento do objeto visando ampla concorrência).
   - **Deep Link:** `/[portalSlug]/fornecedores/[fornecedorCnpj]`.

4. **Deságio Extremo e Risco de Inexequibilidade (`desagio_extremo_inexequibilidade`):**
   - **Gatilho:** Lotes homologados com percentual de desconto atipicamente elevado (> 50% ou > 60%) sobre o valor estimado em categorias de alto risco operacional (alimentação escolar, obras, insumos de saúde), trazendo risco iminente de inexecução contratual ou fornecimento com padrão degradado.
   - **Severidade Sugerida:** `moderado`.
   - **Fundamentação Legal:** [Art. 59, III da Lei Federal nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art59) (critérios objetivos de inexequibilidade de propostas).

5. **Monitoramento Preventivo de Compras Abertas de Saúde e Merenda (`compras_abertas_itens_criticos`):**
   - **Gatilho:** Processos em fase aberta no PNCP contendo itens essenciais (fármacos, fraldas geriátricas, merenda infantil), permitindo controle social tempestivo antes da adjudicação.
   - **Severidade Sugerida:** `informativo`.
   - **Fundamentação Legal:** [Art. 174 da Lei Federal nº 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art174) (transparência ativa via Portal Nacional de Contratações Públicas).
   - **Deep Link:** `/[portalSlug]/licitacoes?situacao=em_andamento&pasta=saude`.

6. **Inconsistência de Vínculos de Pessoal / Harmonização Cadastral (`inconsistencia_vinculo_pessoal`):**
   - **Gatilho:** Profissionais comissionados ou contratados temporários cadastrados sob classificações anômalas no portal de origem (ex: agente político ou excepcional interesse público) e reclassificados pelo pipeline para a categoria real de provimento.
   - **Severidade Sugerida:** Escalonada conforme materialidade do quadro:
     - `moderado`: 1 a 19 profissionais divergentes (< 5% dos não-efetivos).
     - `alto`: 20 a 49 profissionais divergentes (5% a 15% dos não-efetivos).
     - `critico`: ≥ 50 profissionais divergentes (> 15% dos não-efetivos) com potencial mascaramento estrutural de vínculos.
   - **Fundamentação Legal:** [Art. 37, II e IX da CF/88](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art37) (princípios constitucionais do concurso público e limites de contratação temporária).
   - **Deep Link:** `/[portalSlug]/pessoal?ano=[ano]#vinculos`.

---

## Tasks / Subtasks

- [x] Task 1: Modelagem dbt de Anomalias Previdenciárias (CAPREM / RPPS) (AC: 1, 2)
  - [x] Implementar as regras `inadimplencia_aporte_rpps` e `retencao_patronal_rpps` em `fct_anomalias_fiscais_metricas.sql`.
  - [x] Adicionar testes de esquema (`accepted_values`) e testes unitários dbt.
- [x] Task 2: Camada de Acesso a Dados Kysely e Fixtures (AC: 3, 4)
  - [x] Atualizar tipos `TipoAnomalia` em `packages/db/src/queries/radar-civico-alertas.ts`.
  - [x] Atualizar suíte de testes de queries e regerar fixture compactada (`make db/fixture/dump`).
- [x] Task 3: UI, Textos Neutros e Fundamentação Jurídica (AC: 5)
  - [x] Configurar badges, títulos e links legais canônicos para CF/88 e Lei 9.717/1998 nos cards do Radar.
  - [x] Atualizar `llms.txt` e `llms-full.txt`.
- [ ] Task 4 (Sob Análise): Refinamento e Implementação dos Alertas Selecionados de Itens de Compras
  - [ ] Selecionar quais candidatos (`desconto_nulo_pregao`, `disparidade_preco_item`, `concentracao_itens_fornecedor`, `desagio_extremo_inexequibilidade`, `compras_abertas_itens_criticos`) serão formalmente integrados ao mart após a conclusão da Story 12.8.
  - [ ] Implementar lógica correspondente e links para salas de lances (`linkSistemaOrigem`).
