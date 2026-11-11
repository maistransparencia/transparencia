# Inventário e Auditoria de Regras Fiscais Ocultas e Mapeamento STN/MCASP

**Projeto:** Transparência Fiscal Multi-tenant (`transparencia`)  
**Data:** 2026-08-02  
**Referência da História:** Story 1.1 — Fase de Descoberta e Auditoria de Regras Fiscais Ocultas no TypeScript  
**Escopo da Auditoria:** Pacote `@transparencia/db/src/queries/` (15 arquivos TypeScript leitos legados)  

---

## 1. Resumo Executivo & Objetivos

Esta auditoria tem como objetivo catalogar todas as regras contábeis, filtros de domínio, de-para de elementos, constantes hardcoded, fórmulas atuariais/de saúde e joins legados implementados em código TypeScript no repositório `@transparencia/db`. 

Em conformidade com a diretiva de arquitetura **AD-1 (Single Source of Truth no dbt)**, **nenhuma** regra de negócio contábil deve permanecer no runtime do TypeScript. Todas as regras documentadas neste inventário constituem os requisitos de especificação para os dbt Marts e tabelas de dimensões canônicas a serem construídas nas Histórias 1.2, 1.3, 1.4 e 1.5.

---

## 2. Inventário Detalhado por Arquivo Auditado

### 2.1 `posicao_fiscal.ts`
- **Tabelas Origem:** `fct_despesas`, `fct_despesas_por_orgao`, `fct_receitas` (via `fontes_receita.ts`).
- **Filtros e Parâmetros Implicitos:**
  - `fonte = 'restos_a_pagar'` em `fct_despesas` para identificação de restos a pagar pagos e pendentes.
  - Tratamento de Varchar/Numeric com sanitização `parseFloat(val.replace(",", "."))` no JavaScript.
  - Sanitização de descrição: `replace(/^\d{2}\.\d{3}\.\d{3}\s+/, "")` para remover CNPJs do início do nome de credores.
- **Fórmulas Contábeis Auditadas:**
  - **Total Saídas:** $\text{totalSaidas} = \text{despesasPagas} + \text{restosPagosNoAno}$
  - **Saldo Estimado de Caixa:** $\text{saldoEstimado} = \text{totalArrecadado} - \text{totalSaidas}$
  - **Saldo Após Restos:** $\text{saldoAposRestos} = \text{saldoEstimado} - \text{restosPendentesTotal}$
  - **Segregação de Restos por Gestão:** `ano < year ? "Adm. Anterior" : "Adm. Atual"`.
  - **Identificação de Restos Anteriores:** `restosPendentes.find(r => r.ano === year - 1)`.
  - **Restos de Baixo Valor:** Empenhos em `restos_a_pagar` com `0 < empenhado < 10.0` (Threshold padrão de R$ 10,00).

### 2.2 `historia_caprem.ts`
- **Constantes Hardcoded Registradas:**
  - `CAPREM_CODE = "1061"` (Código do Órgão Gestor do RPPS)
  - `CASP_CNPJ = "07.573.075/0001-00"` (Caixa de Assistência à Saúde dos Servidores Públicos)
- **Mapeamento de Elementos de Despesa (`ELEMENTO_LABELS`):**
  - `13`: Contribuições Patronais
  - `46`: Auxílio-Alimentação
  - `71`: Principal da Dívida Contratual Resgatado (Parcelamento)
  - `91`: Sentenças Judiciais
  - `97`: Aporte para Cobertura do Déficit Atuarial do RPPS
- **Lógica de Destinação Fiscais/Orçamentárias:**
  - `Elemento 97` $\rightarrow$ Destino: "Aporte Atuarial (CAPREM)"
  - `Elemento 71` $\rightarrow$ Destino: "Amortização Dívida (CAPREM)"
  - `Fornecedor / Nat / Desc / CNPJ CASP` $\rightarrow$ Destino: "Plano de Saúde (CASP)"
  - `Fornecedor / Nat / Desc CAPREM ou RPPS` $\rightarrow$ Destino: "RPPS (CAPREM)"
  - `Fornecedor / Nat INSS, Receita Federal, RGPS` $\rightarrow$ Destino: "INSS (RGPS)"
  - Demais elementos 13 $\rightarrow$ "Encargo Patronal Geral"
- **Detecção de Parcelamentos CADPREV:**
  - Busca por `descricao ILIKE '%CADPREV%' OR '%PARCELA%' OR '%CONFISSÃO%' OR '%CONFISSAO%'` combinada com `fornecedor ILIKE '%CAPREM%'` ou `elemento = '71'`.
- **Análise da Entidade Gestora de Saúde (CASP):**
  - Subfunções da Saúde: `301`, `302`, `303`, `304`, `305` + Elementos `36` ou `39` com palavras-chave de serviços médicos/clínicas/exames.
  - Classificação de alertas de credores: "Entidade Gestora", "Consórcio Intermunicipal", "Atenção: X Projetos Concomitantes", "Contratação Direta (PF)", "Clínica / PJ Multiprojeto".
- **Indicadores de Risco Atuarial:**
  - **Taxa de Adimplência de Aporte (%):** $\frac{\text{Aporte Quitado (Elem 97)}}{\text{Aporte Exigido (Elem 97)}} \times 100$
  - **Rombo Patronal Não Repassado:** $\max(0, \text{Empenhado Patronal (13)} - \text{Pago Patronal (13)})$
  - **Razão Temporários/Efetivos (%):** $\frac{\text{Temporários + Comissionados}}{\text{Servidores Efetivos}} \times 100$

### 2.3 `historia_saude.ts`
- **Constantes & Filtros Fiscais:**
  - `SAUDE_EMPRESA = "2"` (Identificador da empresa/fundo municipal de saúde em Porciúncula).
  - Subfunção `303` (Suporte Profilático e Terapêutico) $\rightarrow$ Assistência Farmacêutica (Medicamentos e Insumos).
  - Elemento `91` na Função `10` (Saúde) $\rightarrow$ Judicialização da Saúde.
  - Normalização de Modalidades de Licitação: `carona = 'S'` ou termos `carona`/`adesão` $\rightarrow$ "Adesão a ata (carona)".
- **Indicador HHI (Herfindahl-Hirschman Index) de Concentração de Fornecedores de Saúde:**
  - $HHI = \sum_{i=1}^n s_i^2 \times 10.000$, onde $s_i = \frac{\text{Empenhado}_i}{\text{Empenhado Total}}$.
  - Classificação: $HHI < 1500$ (Baixa), $1500 \le HHI < 2500$ (Moderada a Alta), $HHI \ge 2500$ (Alta).
- **Fontes de Receita da Saúde:**
  - União SUS: Código `171300000000` / prefixos `171`, `241` ou descrição com `SUS`/`União`.
  - Estado: Código `172000000000` / prefixos `172`, `242` ou descrição com `Estado`.
  - Intra-orçamentária: Prefixos `175`, `275` ou termos `intra`/`repasse`.

### 2.4 `analise_despesas.ts`
- **Agrupamento de Elementos por Categoria Macroeconômica:**
  - **Pessoal e Encargos:** Elementos `01`, `03`, `11`, `13`, `16`, `91`, `92`, `93`, `94`, `96`.
  - **Diárias:** Elemento `14`.
  - **Material:** Elementos `30`, `31`, `32`, `33`.
  - **Serviços de Terceiros:** Elementos `35`, `36`, `37`, `39`.
  - **Transferências:** Elementos `41`, `42`, `43`, `46`, `47`, `48`, `70`.
  - **Investimentos:** Elementos `44`, `51`, `52`, `61`, `71`.
- **Filtros de Compras e Serviços:** `FORNECEDORES_NATUREZA_MAP = ['30', '36', '39', '52']`.
- **Cálculo de Impacto de Gastos Locais:** Cruzamento de `fornecedor_cidade_clean` com a cidade sede do portal (ex: `PORCIUNCULA`).

### 2.5 `fontes_receita.ts`
- **Codificação de Receitas:**
  - Filtro intra-orçamentário: Prefixos `17` e `27` excluídos na consolidação quando consultado multi-empresa.
  - FPM (Fundo de Participação dos Municípios): Codificação `1.7.1.8.01.2%`, `1718012%` ou descrição `FPM`/`FUNDO DE PARTICIPA`.
  - ICMS: Codificação `1.7.2.8.01.1%`, `1728011%` ou descrição `ICMS`.
  - ISS / IPTU: Codificação `1.1.1.8.01%`, `1.1.1.8.02%` ou descrições `IPTU`/`ISS`/`PROPRIEDADE PREDIA`/`SERVICOS DE QUALQUER NATUREZA`.
  - Emendas Pix / Especiais: Codificação `1.7.1.5%` ou descrição `TRANSFERENCIA ESPECIAL`.
- **Indicador de Dependência Financeira:** $\text{pctPropria} = \frac{\text{Receita Própria}}{\text{Receita Total}} \times 100$. Alerta ativado se $\text{pctPropria} < 10\%$.

### 2.6 `licitacao_gaps.ts` & `anomalias_contratuais.ts`
- **Limites de Dispensa de Licitação (Lei 14.133/2021 e Lei 8.666/1993):**
  - Função helper `dispensationThreshold(numeroObra, tipoObra, objeto)` define limites para Obras/Serviços de Engenharia vs. Compras/Outros Serviços.
  - Detecção de Fracionamento de Despesa: Contratos com valor em janela próxima ao limite ($\text{valor} \ge \text{limite} \times 0.9$ e $\text{valor} < \text{limite}$) recorrentes $\ge 3$ vezes para a mesma empresa/fornecedor no mesmo exercício.

### 2.7 `folha_vs_servicos.ts`
- **Empenhos de Folha de Pagamento:** Elementos `01`, `03`, `11`, `96`.
- **Execução do 13º Salário:** Filtro por `elemento IN ('01', '03', '11', '96')` e descrições com `13` ou `décimo terceiro`, excluindo anulações e encargos previdenciários `136-139`.
- **Faixas de Proventos Salariais (Bins):** 9 faixas salariais (R$ 0 - 2,5k até > R$ 20k).
- **Chefias Efetivas vs. Comissionados Externos:** Categorização baseada nos campos `vinculo` e `categoria_funcional` de `fct_pessoal`.

---

## 3. Estruturação do Mapeamento Exaustivo com Normas STN / MCASP

Em cumprimento estrito ao Requisito Completo STN/MCASP (Portaria STN/SOF nº 163/2001 e Portaria STN nº 448/2002), foram estruturados os catálogos completos a serem populados em dbt seeds / marts.

### 3.1 Catálogo Exaustivo de Elementos de Despesa (`dim_elemento_despesa`)

O catálogo oficial de Elementos de Despesa (Dígitos 5 e 6 da Natureza de Despesa) é composto pelos 99 códigos normatizados:

| Código | Descrição Oficial (Portaria STN nº 448/2002 e atualizações) | Grupo Macro de Categoria |
|---|---|---|
| `01` | Aposentadorias do RPPS, Reserva Remunerada e Reformas dos Militares | Pessoal e Encargos |
| `03` | Pensões do RPPS e do Militar | Pessoal e Encargos |
| `04` | Contratação por Tempo Determinado | Pessoal e Encargos |
| `05` | Outros Benefícios Previdenciários do Servidor ou do Militar | Pessoal e Encargos |
| `06` | Benefício Mensal ao Deficiente e ao Idoso | Transferências |
| `07` | Contribuição a Entidades Fechadas de Previdência | Pessoal e Encargos |
| `08` | Outros Benefícios Assistenciais do Servidor e do Militar | Pessoal e Encargos |
| `09` | Salário-Família | Pessoal e Encargos |
| `10` | Outros Benefícios de Natureza Social | Transferências |
| `11` | Vencimentos e Vantagens Fixas - Pessoal Civil | Pessoal e Encargos |
| `12` | Vencimentos e Vantagens Fixas - Pessoal Militar | Pessoal e Encargos |
| `13` | Contribuições Patronais (RPPS / RGPS) | Pessoal e Encargos |
| `14` | Diárias - Civil | Diárias |
| `15` | Diárias - Militar | Diárias |
| `16` | Outras Despesas Variáveis - Pessoal Civil | Pessoal e Encargos |
| `17` | Outras Despesas Variáveis - Pessoal Militar | Pessoal e Encargos |
| `18` | Auxílio-Financeiro a Estudantes | Transferências |
| `19` | Auxílio-Fardamento | Pessoal e Encargos |
| `20` | Auxílio-Financeiro a Pesquisadores | Transferências |
| `21` | Juros sobre a Dívida por Contrato | Juros e Encargos da Dívida |
| `22` | Outros Encargos sobre a Dívida por Contrato | Juros e Encargos da Dívida |
| `23` | Juros, Deságios e Descontos da Dívida Mobiliária | Juros e Encargos da Dívida |
| `24` | Outros Encargos sobre a Dívida Mobiliária | Juros e Encargos da Dívida |
| `25` | Encargos sobre Operações de Crédito por Antecipação da Receita | Juros e Encargos da Dívida |
| `26` | Arrendamento Mercantil | Outras Despesas Correntes |
| `27` | Encargos pela Honra de Avais, Garantias, Fianças e Referendos | Outras Despesas Correntes |
| `28` | Remuneração de Cotas de Fundos Autárquicos | Outras Despesas Correntes |
| `29` | Distribuição de Resultado de Empresas Estatais Dependentes | Outras Despesas Correntes |
| `30` | Material de Consumo | Material |
| `31` | Premiações Culturais, Artísticas, Científicas, Desportivas e Outras | Outras Despesas Correntes |
| `32` | Material, Bem ou Serviço para Distribuição Gratuita | Material |
| `33` | Passagens e Despesas com Locomoção | Outras Despesas Correntes |
| `34` | Outras Despesas de Pessoal decorrentes de Contratos de Terceirização | Pessoal e Encargos |
| `35` | Serviços de Consultoria | Serviços de Terceiros |
| `36` | Outros Serviços de Terceiros - Pessoa Física | Serviços de Terceiros |
| `37` | Locação de Mão-de-Obra | Serviços de Terceiros |
| `38` | Arrendamento Mercantil | Outras Despesas Correntes |
| `39` | Outros Serviços de Terceiros - Pessoa Jurídica | Serviços de Terceiros |
| `40` | Serviços de Tecnologia da Informação e Comunicação - PJ | Serviços de Terceiros |
| `41` | Contribuições | Transferências |
| `42` | Auxílios | Transferências |
| `43` | Subvenções Sociais | Transferências |
| `44` | Obras e Instalações | Investimentos |
| `45` | Subvenções Econômicas | Transferências |
| `46` | Auxílio-Alimentação | Transferências |
| `47` | Obrigações Tributárias e Contributivas | Outras Despesas Correntes |
| `48` | Outros Auxílios Financeiros a Pessoas Físicas | Transferências |
| `49` | Auxílio-Transporte | Transferências |
| `50` | Sede de Direitos Orçamentários | Outras Despesas Correntes |
| `51` | Obras e Instalações | Investimentos |
| `52` | Equipamentos e Material Permanente | Investimentos |
| `61` | Aquisição de Imóveis | Investimentos |
| `62` | Aquisição de Bens para Revenda | Inversões Financeiras |
| `63` | Aquisição de Títulos Crédito | Inversões Financeiras |
| `64` | Aquisição de Títulos Representativos de Capital já Constituidor | Inversões Financeiras |
| `65` | Constituição ou Aumento de Capital de Empresas | Inversões Financeiras |
| `66` | Concessão de Empréstimos e Financiamentos | Inversões Financeiras |
| `67` | Depósitos Compulsórios | Inversões Financeiras |
| `70` | Rateio pela Participação em Consórcio Público | Transferências |
| `71` | Principal da Dívida Contratual Resgatado (Amortização / Parcelamento) | Amortização da Dívida / Investimentos |
| `72` | Principal da Dívida Mobiliária Resgatado | Amortização da Dívida |
| `73` | Correção Monetária ou Câmbio da Dívida Contratual Resgatada | Amortização da Dívida |
| `74` | Correção Monetária ou Câmbio da Dívida Mobiliária Resgatada | Amortização da Dívida |
| `75` | Amortização da Dívida de Operações de Crédito por ARO | Amortização da Dívida |
| `76` | Principal Operações de Crédito por Antecipação da Receita | Amortização da Dívida |
| `77` | Atuação em Outros Encargos de Amortização | Amortização da Dívida |
| `81` | Correção Monetária de Outras Dívidas | Outras Despesas Correntes |
| `91` | Sentenças Judiciais (Precatórios e RPVs) | Sentenças / Pessoal / Outros |
| `92` | Despesas de Exercícios Anteriores | Outras Despesas Correntes |
| `93` | Indenizações e Restituições | Outras Despesas Correntes |
| `94` | Indenizações e Restituições Trabalhistas | Pessoal e Encargos |
| `95` | Indenização pela Execução de Trabalhos de Campo | Outras Despesas Correntes |
| `96` | Ressarcimento de Despesas de Pessoal Requisitado | Pessoal e Encargos |
| `97` | Aporte para Cobertura do Déficit Atuarial do RPPS | Aporte Atuarial |
| `98` | Compensação Financeira entre Regimes de Previdência | Previdência |
| `99` | A Classificar | Outros |

---

### 3.2 Estrutura da Dimensão Canônica `dim_natureza_despesa`

Conforme a Portaria STN/SOF nº 163/2001, a Natureza da Despesa é composta por 6 dígitos ($C.G.MM.EE$):

1. **Categoria Econômica (1º dígito):**
   - `3`: Despesas Correntes
   - `4`: Despesas de Capital
2. **Grupo de Natureza de Despesa - GND (2º dígito):**
   - `1`: Pessoal e Encargos Sociais
   - `2`: Juros e Encargos da Dívida
   - `3`: Outras Despesas Correntes
   - `4`: Investimentos
   - `5`: Inversões Financeiras
   - `6`: Amortização da Dívida
3. **Modalidade de Aplicação (3º e 4º dígitos):**
   - `20`: Transferências à União
   - `30`: Transferências a Estados e ao DF
   - `40`: Transferências a Municípios
   - `50`: Transferências a Instituições Privadas sem Fins Lucrativos
   - `70`: Transferências a Consórcios Públicos
   - `90`: Aplicações Diretas
   - `91`: Aplicação Direta Decorrente de Operação entre Órgãos (Intra-Orçamentária)
4. **Elemento de Despesa (5º e 6º dígitos):** Conforme tabela 3.1 acima.

---

### 3.3 Estrutura da Taxonomia de Funções e Subfunções (`dim_funcao_subfuncao`)

Estruturada conforme a Portaria MOG nº 42/1999 (Classificação Funcional da Despesa Pública):

- **Principais Funções Orçamentárias (2 dígitos):**
  - `01`: Legislativa
  - `02`: Judiciária
  - `03`: Essencial à Justiça
  - `04`: Administração
  - `06`: Segurança Pública
  - `08`: Assistência Social
  - `09`: Previdência Social
  - `10`: Saúde
  - `12`: Educação
  - `13`: Cultura
  - `15`: Urbanismo
  - `16`: Habitação
  - `17`: Saneamento
  - `18`: Gestão Ambiental
  - `20`: Agricultura
  - `28`: Encargos Especiais

- **Subfunções Relevantes Auditadas (3 dígitos):**
  - `10.301`: Atenção Básica
  - `10.302`: Assistência Hospitalar e Ambulatorial
  - `10.303`: Suporte Profilático e Terapêutico (Assistência Farmacêutica)
  - `10.304`: Vigilância Sanitária
  - `10.305`: Vigilância Epidemiológica
  - `09.272`: Previdência do Regime Estatutário (RPPS)
  - `28.843`: Serviço da Dívida Interna
  - `28.846`: Outros Encargos Especiais (Sentenças Judiciais / Precatórios)

---

## 4. Próximos Passos de Implementação (Hand-off para Histórias dbt)

1. **História 1.2:** Criar os seeds/models dbt para as dimensões canônicas `dim_elemento_despesa`, `dim_natureza_despesa` e `dim_funcao_subfuncao` utilizando os mapeamentos deste inventário.
2. **História 1.3:** Implementar `fct_posicao_fiscal_metricas` no dbt incorporando as fórmulas de saldo estimado, restos a pagar e top credores.
3. **História 1.4:** Implementar `fct_analise_despesas_metricas` consolidando agrupamentos por categoria macroeconômica e gastos locais.
4. **História 1.5:** Implementar os marts de domínio específico (`fct_historia_caprem_metricas` e `fct_historia_saude_metricas`) com todos os de-para atuariais e de saúde mapeados neste documento.
