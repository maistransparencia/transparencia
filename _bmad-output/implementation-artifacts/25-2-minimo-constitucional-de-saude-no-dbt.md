---
status: done
baseline_commit: 2f685af639825d4c7376d3e047542c3ab7e974e8
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
4. **Seed:** criar a linha `minimo_aplicacao_saude_percentual` (15,00 pontos percentuais) em `elt/transform/seeds/seed_constantes_fiscais.csv`, base LC 141/2012 art. 7º, com link oficial (Regra 20). A vigência da nova redação pela LC 227/2026 está **NÃO VERIFICADA**: registrar assim, pedir o parecer do `jurista-fiscal` e seguir `docs/governanca-constantes-fiscais.md`.

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

## Registro da implementação

### Entregue

- Extrator `elt/extract/siops.py` e carregador `elt/load/siops.py` (raw `raw_siops.siops_indicadores`, chave `portal_slug, ano, periodo, via, codigo_indicador`). Alvo `make elt/siops` (`PORTAL`, `YEARS`, `DRY_RUN`).
- Staging `stg_siops__indicadores`; marts `fct_saude_minimo_constitucional` e `fct_saude_minimo_conferencia`; seeds `seed_saude_minimo_base_calculo` e linha `minimo_aplicacao_saude_percentual` em `seed_constantes_fiscais`.
- Testes: `elt/extract/__tests__/test_siops.py` (contrato do HTML) e `elt/tests/test_fct_saude_minimo_constitucional.py` (marts). `make check` e `make test` (331) passam.

### Decisões que mudaram ou completaram a spike

- Divergência entre as vias **não aborta a carga para o 2.1 e o 3.1**: a spike achou 4 divergências em 78 valores reais (2.1 nos dois municípios em 2024: 2.768,73 contra 2.855,86 e 2.520,07 contra 2.599,65), então abortar travaria a carga diária. As duas vias são gravadas e o mart expõe `divergencia_entre_vias` e `indicadores_divergentes`; o teste dbt é `severity: warn`. Exceção decidida pelo Julio: divergência no **3.2** (o número comparado com o mínimo) é erro explícito no extrator, e o mart deixa `cumpre_minimo` nulo.
- O SIOPS não informa a data da última transmissão: o mart carrega `coletado_em`.
- O seed usa **pontos percentuais** (`minimo_aplicacao_saude_percentual`, `15.00`), como `minimo_aplicacao_mde_percentual` (`25.00`) e os limites da LRF. A story pedia `0.15`; mudou por padronização (decisão do Julio). O mart repassa o valor sem conversão.
- Percentual fora de 0 a 100 ou valor monetário negativo é erro explícito, só para os portais do seed (um valor ruim de outro município no TABNET não derruba a carga).

### Critério 1: conciliação do município A em 2024 (RECEITA CONCILIADA, DESPESA EM ABERTO)

**Receita: conciliada ao centavo.** Dois erros do cálculo próprio inicial, ambos achados comparando com o TABNET:
1. As **cotas extraordinárias do FPM** (`1711.51.2`: R$ 2.897.965,31 em A e R$ 2.419.855,98 em B, em 2024) estavam na base. O art. 7º da LC 141 cita só a alínea "b" do inciso I do art. 159; as cotas adicionais não estão no texto. Fora a diferença de A cai de R$ 2.776.806,50 para R$ 155.866,39 e a base de B bate com o SIOPS.
2. Faltava a **compensação do ICMS** (`1729.53`, art. 3º da LC 194/2022: R$ 155.866,39 em A; a LC 198/2023 trata do FPM de municípios com perda de população, não desta compensação). Entra pelo art. 9º da LC 141 ("qualquer compensação financeira proveniente de impostos e transferências constitucionais"). É exatamente o resíduo de A.

Com a base corrigida (`seed_saude_minimo_base_calculo.csv`) a receita bate com `R.Impostos_e_Transf.Const` do SIOPS **ao centavo** em 5 de 8 combinações testadas: A 2024 (R$ 65.750.268,45) e 2025, B 2023, 2024 e 2025. **Não bate** em 2022 (A: +R$ 911.362,62; B: +R$ 806.727,51) e em A 2023 (+R$ 749.443,31): causa não investigada.

**Despesa: em aberto.** SIOPS R$ 13.266.548,87 contra R$ 15.611.891,10 do cálculo próprio (diferença R$ 2.345.342,23). Estágio não explica (liquidado = pago = R$ 15.611.891,10; empenhado líquido R$ 15.629.470,43). Nenhuma combinação de elementos, subfunções e tipos de empenho soma a diferença. Falta o demonstrativo declarado ao SIOPS (linhas do Anexo 12), que o Siconfi não traz. O cálculo próprio continua só como conferência.

### Critério 2: teste a partir do CI

**Ainda não executado.** O workflow de sondagem criado para isso foi removido por decisão do Julio: a carga recorrente do SIOPS entra na Story 23.8 (grupo mensal), e o primeiro run dela mede timeout, limite de taxa e repetição a partir do CI. Esta story **não depende** da 23.8. Localmente: ~1 s por requisição com pausa de 1 s, nenhum 429 nem timeout em 24 registros; timeout de 120 s e 3 tentativas com espera crescente.

### Critério 4: seed e parecer do `jurista-fiscal` (2026-11-06)

Leitura de textos do Planalto baixados hoje (`lcp141.htm`, `lcp227.htm`, `lcp214.htm`); parecer de apoio, não de advogado.

- **Norma aplicável:** LC 141/2012 art. 7º, com a redação dada pela LC 227/2026 art. 170. Texto: piso de 15% da arrecadação dos impostos do art. 156, dos recursos do art. 158 e do art. 159, I, "b" e §3º, e da receita distribuída aos Municípios do imposto do art. 156-A. URL: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp141.htm`.
- **Vigência:** LC 227 art. 182: vigor na publicação (DOU de 14.1.2026) com efeitos imediatos para os dispositivos fora dos incisos I (1º/1/2027: art. 76, II, "c", e art. 169) e II (art. 52, §§ 4º e 5º). O art. 170 não está nas exceções, então a nova redação vale desde 14.1.2026. O percentual (15%) não mudou, então **uma linha só no seed basta** (2012 a 2099); o que mudou é a base, e a mudança é registrada no texto da linha.
- **IBS na base:** em 2026 o IBS cobrado (0,1%) não observa vinculações nem repartições e vai para o Comitê Gestor e o fundo de compensação (LC 214/2025 art. 343, parágrafo único). Logo **não há IBS municipal na base de 2026**. De 2027 em diante (art. 344: alíquota municipal de 0,05%) **NÃO VERIFICADO**: o que é repartido aos Municípios e quando.
- **Comparador:** "no mínimo 15%" (art. 7º) cumpre-se com `>= 15`. Correto no mart.
- **Base de receita do cálculo próprio:** os códigos do seed correspondem ao art. 156 (impostos, incluindo a dívida ativa, multas e juros de mora dos impostos, pelos arts. 9º e 10), art. 158 (IRRF, ITR, IPVA, ICMS), art. 159 I "b" (FPM mensal) e §3º (IPI-exportação), e a compensação do ICMS (art. 9º). CIDE e cotas extraordinárias do FPM ficam de fora. **NÃO VERIFICADO:** se cada portal contabiliza multas e juros de mora dos impostos dentro do código `1110` (em A estão dentro; em outros portais podem estar no grupo `19`).
- **Estágio da despesa:** o art. 24 da LC 141 manda considerar despesas liquidadas e pagas no exercício e as empenhadas e não liquidadas inscritas em restos a pagar até a disponibilidade de caixa, consolidadas no Fundo de Saúde. A página do SIOPS informa que o 3.2 usa a despesa empenhada com dedução de restos a pagar sem disponibilidade financeira. Os métodos não são idênticos. Por isso a tela diz "calculado pelo SIOPS" e **não afirma cumprimento legal**: quem verifica a aplicação é o Tribunal de Contas (art. 25, parágrafo único), e a diferença não aplicada se soma ao mínimo do ano seguinte (art. 25).
- **Natureza:** o 15% é limite legal direto; o 3.2 é cálculo do sistema, não é a lei. O cálculo próprio é conferência.
- **Risco:** o texto da tela da 25.3 não pode dizer que a Prefeitura "cumpriu" ou "descumpriu" a lei; diz o valor calculado pelo SIOPS e a régua de 15%. Licença de reuso dos dados do SIOPS continua **NÃO VERIFICADA**.
- **Pendências:** IBS municipal em 2027 em diante (LC 214, arts. 344 e seguintes); termos de uso do SIOPS; parecer de advogado antes de publicar texto sobre cumprimento.

### Pendências conhecidas (visíveis na revisão)

Decididas pelo Julio na revisão de código de 2026-11-06. A story fica em `review` porque o número que o cidadão vê (3.2 do SIOPS, pelas duas vias) não depende delas. A 25.3 não pode apresentar o cálculo próprio como fato medido (regra 27).

- **Despesa não conciliada (critério 1):** SIOPS R$ 13.266.548,87 contra R$ 15.611.891,10 do cálculo próprio em A 2024. Conferido em 2026-11-06 com o CSV do portal municipal (despesas por fonte de recurso e por desdobro, 2024): a fonte `01-500` (impostos e transferências de impostos) tem R$ 15.611.891,10 liquidados e pagos, igual ao cálculo próprio, então o nosso número reproduz o portal. O SIOPS declara despesa total com saúde de R$ 49.372.023,59, **maior** que os R$ 47.671.437,61 empenhados no portal, e atribui menos dela a recursos próprios. Não há inativos nem pensionistas no desdobro. **Diferença de atribuição da fonte de recurso, causa não provada.** Hipótese não verificada: parte da despesa da `01-500` declarada ao SIOPS como paga com outra fonte. Só o demonstrativo declarado ao SIOPS (despesa por fonte e subfunção) fecha. Não abre story nova. Texto da tela (25.3): sem afirmar que a Prefeitura declarou menos nem sugerir irregularidade; "calculado pelo SIOPS com dados enviados pela Prefeitura".
- **Receita não bate em 2022 (A e B) e em A 2023:** causa não investigada.
- **Medição a partir do CI (critério 2):** adiada para o primeiro run da Story 23.8. Nota para a 23.8: em janeiro e fevereiro o TABNET do ano recém-fechado pode ainda não existir; o extrator aborta com "TABNET de AAAA indisponível ou ainda não publicado" e o alerta deve tratar isso como esperado. Medir em janeiro de 2027 o dia em que `indmun26.dbf` aparece na lista de anos do formulário (a página não informa data de publicação).
- **Base de receita ainda incompleta:** dívida ativa, multas e juros de mora (só há o prefixo `1110.`, "NÃO VERIFICADO" se o portal os escritura ali), IOF-ouro e IBS a partir de 2027.
- **Vigência do `1729.53`:** a linha do seed passou a começar em 2022 (ano da LC 194/2022; o ano mínimo padrão do portal é 2021). **Confirmar o ano de início com o `jurista-fiscal`.**
- **Despesa da conferência por texto livre** (`fonte_recurso_desc`): o raw de despesa não traz o código de fonte STN.

### Decisões da revisão de código (2026-11-06)

- Via nula no 3.2: o mart continua marcando divergência e deixando `cumpre_minimo` nulo; o extrator só avisa ("Só uma das vias do SIOPS tem valor"). O aborto continua só para o 3.2 com valor nas duas vias.
- TABNET do ano fechado ainda não publicado: mantido o tudo-ou-nada, com mensagem clara.
- Testes acrescentados: carregador raw (DDL real e upsert idempotente), limite exato de 15,00/14,99, uma via nula nos dois sentidos, faixa 0 a 100 e `not_null` do mínimo no dbt.

### Parecer do `jurista-fiscal` sobre o início da vigência do `1729.53` (2026-11-06)

- **Norma:** a compensação vem do art. 3º da LC 194/2022 (`https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp194.htm`), publicada em 23.6.2022, vigente desde a publicação (art. 15). Ela trata das perdas de arrecadação de ICMS de 2022. Entra na base do mínimo pelo art. 9º da LC 141 ("qualquer compensação financeira proveniente de impostos e transferências constitucionais").
- **Vigência:** `ano_inicio` 2022 é o limite inferior pela lei (um recebimento não pode anteceder a norma). **Nos dados locais a receita aparece só de 2023 em diante** (A: R$ 1.411.162,91 em 2023, R$ 155.866,39 em 2024, R$ 49.769,90 em 2025; B: R$ 672.006,40 em 2023), porque a compensação das perdas de 2022 foi repassada depois. Manter 2022 é correto e inofensivo.
- **Erro corrigido na descrição do seed:** a LC 198/2023 não é sobre compensação do ICMS (altera a LC 91 para manter coeficientes do FPM de municípios com redução populacional). A linha do portal com esse nome fica dentro do `1729.53` mas não muda a base legal.
- **NÃO VERIFICADO:** por que a receita de A em 2023 fica R$ 749.443,31 acima do SIOPS mesmo com a compensação (R$ 1.411.162,91) incluída; possível parcela da compensação que o SIOPS não considera.
