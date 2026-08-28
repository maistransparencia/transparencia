# Governança de Constantes Fiscais e Limites Regulatórios

Este documento estabelece o protocolo operacional de manutenção, atualização e auditoria das constantes fiscais mantidas no seed SSOT do dbt (`elt/transform/seeds/seed_constantes_fiscais.csv`).

---

## 1. Visão Geral e Arquitetura SSOT

O repositório adota o princípio de **Single Source of Truth (SSOT)** para todos os parâmetros fiscais e limiares regulatórios. Em vez de hardcoding de valores em queries SQL ou código TypeScript, todos os limites são parametrizados na tabela `seed_constantes_fiscais`.

### Estrutura do Seed (`seed_constantes_fiscais.csv`)
| Coluna | Tipo | Descrição |
|---|---|---|
| `dominio` | `text` | Área temática (`licitacoes`, `pessoal`, `despesas`, `opacidade`) |
| `chave` | `text` | Identificador único em lowercase snake_case da constante |
| `ano_inicio` | `integer` | Primeiro ano de vigência do valor |
| `ano_fim` | `integer` | Último ano de vigência do valor (ex: `2099` para vigência aberta) |
| `valor_num` | `numeric` | Valor numérico (R$ monetário ou percentual %) |
| `valor_txt` | `text` | Código textual ou elemento quando não numérico |
| `descricao` | `text` | Explicação sucinta do significado do parâmetro |
| `base_legal` | `text` | Citação canônica da lei, decreto ou acórdão |
| `url_base_legal` | `text` | Link oficial para o texto normativo no Planalto/STN/TCU |

---

## 2. Fontes Oficiais de Governança

Todas as constantes inseridas ou revisadas devem conter links para repositórios normativos governamentais oficiais:

1. **Presidência da República (Portal da Legislação / Planalto):**
   - Leis Federais (ex: [Lei nº 4.320/1964](http://www.planalto.gov.br/ccivil_03/leis/l4320.htm), [Lei nº 14.133/2021](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)).
   - Leis Complementares (ex: [LC nº 101/2000 - LRF](http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm)).
   - Decretos de Atualização Anual de Limites de Licitação (ex: Dec. 10.922/21, Dec. 11.317/22, Dec. 11.871/23, Dec. 12.343/24, Dec. 12.807/25).
2. **Secretaria do Tesouro Nacional (STN / Siconfi):**
   - Manual de Contabilidade Aplicada ao Setor Público (MCASP) e Portarias STN/SOF de classificação por natureza de despesa e fontes de recursos ([Tesouro Nacional](https://www.gov.br/tesouronacional/pt-br)).
3. **Tribunal de Contas da União (TCU):**
   - Jurisprudência e Acórdãos de auditoria orçamentária (ex: [Acórdão TCU nº 1.540/2014 - Plenário](https://pesquisa.apps.tcu.gov.br/)).
4. **Tribunal de Contas do Estado do Rio de Janeiro (TCE-RJ):**
   - Deliberações e instruções normativas de fiscalização municipal (ex: Deliberação TCE-RJ nº 200/96).

---

## 3. Calendário de Revisões e Ciclo de Vida

- **Virada de Exercício Fiscal (Dezembro / Janeiro):**
  - Publicação do Decreto Federal de atualização dos limites de dispensa da Lei 14.133/2021 (Art. 75).
  - Ação: Criar os novos registros para o ano vigente em `seed_constantes_fiscais.csv`, ajustando o `ano_fim` da linha anterior.
- **Alterações de Metodologia STN / LRF:**
  - Caso haja revisão de limites prudenciais ou planos de contas, atualizar o registro correspondente.
- **Novas Regras de Auditoria Forense / Opacidade:**
  - Limiares de atenção e criticidade para subitens `.99` e índices de transparência orçamentária.

---

## 4. Checklist de Atualização

Ao modificar ou adicionar qualquer constante fiscal:

1. [ ] **Editar o Seed:** Atualizar `elt/transform/seeds/seed_constantes_fiscais.csv` com `url_base_legal` válida.
2. [ ] **Recompilar Seeds e Rodar Testes dbt:**
   ```bash
   make dbt/seed
   make dbt/test
   ```
3. [ ] **Validar a Suíte Completa de Testes:**
   ```bash
   make test
   make test/ts
   ```
4. [ ] **Verificar Paridade Frontend:** Garantir que queries Kysely e View Models que consom a tabela reflitam os novos limiares.
