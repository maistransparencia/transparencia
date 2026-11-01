# Epic 24 Context: Educação: Aprendizado e Financiamento (Dados do SIOPE e do INEP)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A página de educação passa a abrir pelo aprendizado ("as crianças estão aprendendo?") e, logo abaixo, responde duas perguntas que hoje ficam sem resposta: "quanto a Prefeitura investe por aluno?" e "a Prefeitura aplica o mínimo exigido em educação?". A fonte financeira é o SIOPE (FNDE), declarado pelo município e conferido pelo contador da educação. A estimativa anterior de pago por aluno foi retirada porque o seed de matrículas não tinha fonte rastreável e divergia do SIOPE.

## Stories

- Story 24.1: Ingestão do Relatório Gerencial do SIOPE
- Story 24.2: Staging e Mart de Indicadores do SIOPE no dbt
- Story 24.3: Contratos de Dados do SIOPE em `@transparencia/db`
- Story 24.4: Valor por Aluno na Página de Educação
- Story 24.5: Mínimos Constitucionais de Educação (MDE e FUNDEB)
- Story 24.6: Total de Alunos com Fonte Verificada (INEP)
- Story 24.7: Aprendizado no Topo da Página de Educação
- Story 24.8: Emendas da Educação: Conferência entre o Portal Municipal e a Fonte Federal (esboço)

## Requirements & Constraints

- Indicadores SIOPE de interesse: 4.9 (investimento por aluno), 4.8 (educação básica), 4.1 (infantil), 4.2 (fundamental), 1.1 (aplicação em MDE, mínimo 25%) e 1.2 (magistério).
- A consulta de planilhas do SIOPE exige reCAPTCHA: não automatizar nem contornar. Usar apenas a API JSON do Relatório Gerencial do FNDE (`/siope/relatorioGerencialIndicador.do`), aberta mas interna e não documentada: exige teste de contrato e falha graciosa.
- Dado SIOPE é declaratório (homologado pelo FNDE, não é auditoria): a tela deve dizer que é declarado pela Prefeitura. Valores ausentes ficam nulos (nunca zero) e o ano em andamento é marcado como parcial ("—" com a causa).
- Piso do FUNDEB para magistério é 70% (art. 26 da Lei 14.113/2020), não os 60% do rótulo antigo do SIOPE (indicador 1.2); só exibir após conferência do `contador-publico` e do `jurista-fiscal`. Mínimo de MDE: 25% (Art. 212 e 212-A da CF/88). Limites vêm de `seed_constantes_fiscais.csv`. O mínimo é de aplicação, não de repasse.
- Abaixo do mínimo: tom factual ("indício", nunca "irregularidade"); status com texto e ícone, nunca só cor. Lei citada com link oficial.
- Sem média estadual, ranking ou comparação entre municípios para valor por aluno; valores históricos na moeda da época, sem correção pela inflação.
- Fora do escopo: automatizar formulário com captcha; reproduzir planilhas de receita/despesa do SIOPE.
- Matrículas só entram com fonte oficial automatizável (INEP); nenhum valor digitado à mão. Se o spike não confirmar a fonte, registrar a decisão e manter o indicador fora da página.
- Textos passam pelo `editor-cidadao`; cada story de página atualiza `llms.txt`, `llms-full.txt`, CHANGELOG e specs de página, view-model e componente.

## Technical Decisions

- Raw: um registro por `portal_slug`, `ano`, `periodo`, `codigo_indicador`, com valor, código SIOPE de 6 dígitos derivado de `cod_ibge` e `coletado_em`.
- A API deve ser consultada com um município por requisição (em lote ela devolve a média com `codEnte` zerado, verificado em 2026-11-01); validar o formato antes de gravar; resposta HTML (erro 99), formato inesperado ou indicador ausente não grava nada e termina com aviso. `User-Agent`/`Referer` no padrão da API e limite de taxa.
- Mart dbt `fct_educacao_siope_metricas`, grão `portal_slug` + `ano`, colunas explícitas (`investimento_por_aluno_basica`, `investimento_por_aluno`, `percentual_aplicado_mde`), contrato imposto, testes de unicidade, isolamento entre portais e intervalo plausível. Caso de referência de Porciúncula: 2024 = R$ 16.789,15; 2025 = R$ 16.767,14.
- DTOs `camelCase` em `@transparencia/db` com valor, ano, período, situação (`encerrado`/`parcial`) e série anual; nenhum cálculo contábil no TypeScript (Regra 14).
- Variação de posição no ranking do IDEB calculada em `@transparencia/db` a partir do `cod_ibge`, com a mesma regra de ordenação do ciclo atual; se o total de redes do ciclo anterior for diferente, o texto diz isso. IDEB é bienal: falar "ciclo anterior", nunca "ano anterior". Ranking em `getEducacaoRankingEstadual` pode precisar aceitar o ciclo como parâmetro.
- Regras transversais: sem literais de tenant, UF, "Média RJ" ou ano fixo em títulos (Regra 23); execução só no banco local Docker (Regra 15); nomes de métricas explícitos (Regra 9).

## UX & Interaction Patterns

- Ordem da página: "Aprendizado dos alunos" (`EducacaoAprendizadoSection`) sobe para o primeiro bloco, sem hero novo; depois valor por aluno (24.4) e mínimos legais (24.5), sem reservar espaço vazio enquanto não prontos; o hero financeiro e demais seções descem sem perder conteúdo; seções para especialistas ficam no fim.
- Cada bloco responde a uma pergunta do cidadão em linguagem comum. Por etapa (anos iniciais/finais): nota atual com ano junto da nota do ciclo anterior, ano e variação em pontos, com sinal e palavra ("subiu"/"caiu"); "Meta" visível, com a causa quando o MEC não definiu meta; sem dado do ciclo anterior mostra "—" com a causa.
- Detalhe técnico fica atrás de "Ver detalhes" (histórico anual). Seguir `DESIGN.md` e `EXPERIENCE.md` nos temas claro e escuro.
- A citação "Nota Informativa do Ideb 2025" em `educacao-historico-section.tsx` não deve depender de ano fixo.

## Cross-Story Dependencies

- 24.1 -> 24.2 -> 24.3 -> 24.4 e 24.5 (cadeia de dados do SIOPE).
- 24.7 não tem dependências e deve ser entregue antes de 24.4; 24.4 e 24.5 entram logo abaixo dela.
- 24.6 é independente (pode rodar em paralelo a 24.1) e condicionada ao resultado do spike do INEP; fornece o denominador visível do valor por aluno.
- 24.1 pode registrar a coleta conforme a Story 23.1 (frescor dos dados) quando existir.
- 24.8 depende das Stories 25.1 (spike) e 25.5 (método compartilhado de cruzamento, saúde).
