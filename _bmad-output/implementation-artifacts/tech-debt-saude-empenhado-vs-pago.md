# Débito Técnico / Backlog Item: Exibição Dupla (Empenhado vs Pago) nos Cartões da Saúde

## Plano Detalhado de Implementação
- **Plano de Referência**: [plan_exibir_empenhado_e_pago_saude.md](file:///Users/juliobetta/.gemini/antigravity-cli/brain/ca5defa5-3729-49eb-bbb2-ac2bdf163a0e/plan_exibir_empenhado_e_pago_saude.md)

## Contexto e Objetivo
Atualmente, a página da Saúde (`/porciuncula_prefeitura/saude`) e o mart `fct_historia_saude_metricas.sql` utilizam o valor **Empenhado** em destaque nos cartões de *Medicamentos e Insumos* e *Judicialização da Saúde*, garantindo 100% de paridade de exibição com o portal em produção.

Como melhoria de transparência fiscal futura (Story 3-6 do Epic-3), os cartões e mart deverão ser expandidos para exibir **ambos os valores simultaneamente**:
- **Valor Principal (em destaque)**: Valor **Empenhado** (`R$ 42,2mil` e `R$ 3,6mil`)
- **Subtexto / Legenda**: Valor **Pago** (`R$ 20,2mil pagos` e `R$ 2,5mil pagos`)

## Requisitos de Implementação Futura (Story 3-6)
1. **dbt (`fct_historia_saude_metricas.sql`)**:
   - Adicionar as colunas `medicamentos_insumos_empenhado` e `medicamentos_insumos_pago`.
   - Adicionar as colunas `judicializacao_empenhado` e `judicializacao_pago`.
   - Atualizar contrato `_fct_historia_saude_metricas.yml`.
2. **TypeScript (`@transparencia/db`)**:
   - Expor ambos os campos no `HistoriaSaudeMetricsDTO` e `AssistenciaFarmaceuticaSaude`.
3. **UI (`apps/web/app/[portalSlug]/saude/page.tsx`)**:
   - Renderizar o valor pago no subtexto dos `KPICard` de Medicamentos e Judicialização.

## Vínculo com a Epic e Story
- **Epic**: Epic-3 (Desacoplamento e Reestruturação de Métricas da UI)
- **Story Alvo**: `3-6-complemento-metrico-de-despesas-saude-e-caprem`
- **Plano de Execução**: [plan_exibir_empenhado_e_pago_saude.md](file:///Users/juliobetta/.gemini/antigravity-cli/brain/ca5defa5-3729-49eb-bbb2-ac2bdf163a0e/plan_exibir_empenhado_e_pago_saude.md)
