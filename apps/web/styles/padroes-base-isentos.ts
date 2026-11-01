import type { RegraPadraoBase } from "./padroes-base";

/**
 * Dívida temporária: páginas e modais ainda não migrados para os padrões base
 * (`DESIGN.md`). Só pode diminuir: cada story de migração remove as suas
 * entradas e baixa `TETO_ISENTOS_TEMPORARIOS`. A Story 20.18 deve zerá-la.
 */
export const isentosTemporarios: Record<RegraPadraoBase, readonly string[]> = {
  "cor-slate-gray-black-white": [
    "apps/web/app/error.tsx",
    "apps/web/app/global-error.tsx",
    "apps/web/app/municipal-landing-client.tsx",
    "apps/web/app/privacidade/page.tsx",
    "apps/web/components/city-interest-block.tsx",
    "apps/web/components/city-interest-modal.tsx",
    "apps/web/components/entidade-select-compact.tsx",
    "apps/web/components/extraction-notification-banner.tsx",
    "apps/web/components/newsletter-modal.tsx",
    "apps/web/components/push-notification-prompt.tsx",
  ],
  "tamanho-de-fonte-em-titulo": [
    "apps/web/app/[portalSlug]/despesas/page.tsx",
    "apps/web/app/[portalSlug]/licitacoes/page.tsx",
    "apps/web/app/error.tsx",
    "apps/web/app/global-error.tsx",
    "apps/web/app/municipal-landing-client.tsx",
    "apps/web/app/privacidade/page.tsx",
    "apps/web/app/termos/page.tsx",
    "apps/web/components/cards-secundarios-visao-geral.tsx",
    "apps/web/components/city-interest-block.tsx",
    "apps/web/components/city-interest-modal.tsx",
    "apps/web/components/contrato-detalhes-modal.tsx",
    "apps/web/components/contratos-servicos-vigentes-section.tsx",
    "apps/web/components/destaque-linha.tsx",
    "apps/web/components/farmacia/farmacia-cabecalho.tsx",
    "apps/web/components/farmacia/farmacia-fonte-dados.tsx",
    "apps/web/components/farmacia/farmacia-indice-az.tsx",
    "apps/web/components/farmacia/farmacia-resultados.tsx",
    "apps/web/components/farmacia/farmacia-resumo-card.tsx",
    "apps/web/components/farmacia/farmacia-sentinelas.tsx",
    "apps/web/components/feedback-modal.tsx",
    "apps/web/components/folha-lrf-history-chart.tsx",
    "apps/web/components/hero-fiscal-card.tsx",
    "apps/web/components/licitacoes-em-andamento-section.tsx",
    "apps/web/components/newsletter-modal.tsx",
    "apps/web/components/push-notification-prompt.tsx",
    "apps/web/components/restos-a-pagar-vendors-chart.tsx",
    "apps/web/components/saldo-caixa-resumo-card.tsx",
    "apps/web/components/termometro-opacidade-fiscal.tsx",
    "packages/ui/src/components/modal-dialog.tsx",
    "packages/ui/src/components/sidebar.tsx",
  ],
  "titulo-h5-h6": [],
  "font-mono-fora-de-tabela-e-numeric": [
    "apps/web/components/cards-secundarios-visao-geral.tsx",
    "apps/web/components/contrato-detalhes-modal.tsx",
    "apps/web/components/contratos-servicos-vigentes-section.tsx",
    "apps/web/components/despesas-areas-section.tsx",
    "apps/web/components/farmacia/farmacia-resumo-card.tsx",
    "apps/web/components/farmacia/farmacia-selo-transparencia.tsx",
    "apps/web/components/farmacia/farmacia-sentinelas.tsx",
    "apps/web/components/hero-fiscal-card.tsx",
    "apps/web/components/licitacoes-em-andamento-section.tsx",
    "apps/web/components/licitacoes-spotlight-modal.tsx",
    "apps/web/components/pipeline-execucao.tsx",
    "apps/web/components/saldo-caixa-resumo-card.tsx",
    "apps/web/components/termometro-opacidade-fiscal.tsx",
    "packages/ui/src/components/dense-table.tsx",
    "packages/ui/src/components/indicadores-linha.tsx",
    "packages/ui/src/components/kpi-card.tsx",
  ],
};

/** Total de entradas de `isentosTemporarios` na criação da guarda; só pode baixar. */
export const TETO_ISENTOS_TEMPORARIOS = 56;

/**
 * Isenções permanentes e legítimas, cada uma com o motivo: e-mails, imagens
 * OG, cores de série de gráficos e mapa Leaflet.
 */
export const isentosPermanentes: Record<
  RegraPadraoBase,
  Readonly<Record<string, string>>
> = {
  "cor-slate-gray-black-white": {},
  "tamanho-de-fonte-em-titulo": {},
  "titulo-h5-h6": {},
  "font-mono-fora-de-tabela-e-numeric": {},
};
