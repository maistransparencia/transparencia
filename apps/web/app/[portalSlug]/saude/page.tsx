import {
  AlertBox,
  fmtCompact,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import type { Metadata } from "next";
import { buildFornecedoresLinhas } from "@/app/[portalSlug]/despesas/view-model";
import { DespesasFornecedoresSection } from "@/components/despesas-fornecedores-section";
import { SaudeContratacaoSection } from "@/components/saude-contratacao-section";
import { SaudeEmendasSection } from "@/components/saude-emendas-section";
import { SaudeEvolucaoAnual } from "@/components/saude-evolucao-anual";
import { SaudeHeroSection } from "@/components/saude-hero-section";
import { SaudeOrigemRecursos } from "@/components/saude-origem-recursos";
import { createPortalMetadata } from "@/lib/metadata";
import { loadSaudeData } from "./loader";
import { buildSaudeViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface SaudePageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string }>;
}

export async function generateMetadata({
  params,
}: SaudePageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Saúde", portalSlug, {
    description:
      "Transparência da aplicação de recursos na saúde pública municipal, repasses SUS, emendas parlamentares e gastos com saúde.",
    path: "/saude",
    keywords: [
      "saúde pública",
      "recursos da saúde",
      "SUS municipal",
      "gastos com saúde",
      "emendas da saúde",
    ],
  });
}

export default async function SaudePage({
  params,
  searchParams,
}: SaudePageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadSaudeData(portalSlug, resolvedSearchParams);
  const viewModel = buildSaudeViewModel(rawData);
  const { selectedYear, isCurrentYear, partialPeriod, saude } = viewModel;

  const totalEmendas =
    saude.emendasStats?.totalAutorizado ??
    saude.fontesReceita?.emendasParlamentares ??
    0;
  const totalEmpenhado = saude.emendasStats?.totalEmpenhado ?? 0;
  const taxaEmpenho = saude.emendasStats?.taxaEmpenho ?? 0;
  const hasEmendas = totalEmendas > 0;

  const emendasSubtext = (() => {
    if (!hasEmendas) {
      return "Nenhuma emenda destinada no exercício";
    }
    if (totalEmpenhado === 0) {
      return (
        <span className="font-semibold text-warn-text">
          Nenhum valor empenhado
        </span>
      );
    }
    return `${fmtCompact(totalEmpenhado)} empenhados (${fmtPercent(taxaEmpenho * 100)})`;
  })();

  const fornecedoresLinhas = buildFornecedoresLinhas(
    saude.topFornecedores,
    saude.orcamento.pago,
  );
  const valorPagoTopFornecedores = fornecedoresLinhas.reduce(
    (total, fornecedor) => total + fornecedor.valorPago,
    0,
  );
  const concentracaoTopFornecedores = fornecedoresLinhas.reduce(
    (total, fornecedor) => total + fornecedor.percentualTotalPago,
    0,
  );

  return (
    <div className="space-y-12 pb-12">
      {/* Seção 1: Hero (Novo) */}
      <div className="space-y-8">
        <SaudeHeroSection
          ano={selectedYear}
          isCurrentYear={isCurrentYear}
          partialPeriod={partialPeriod}
          orcamento={saude.orcamento}
          fontesReceita={saude.fontesReceita}
        />

        <IndicatorPanel columns={4}>
          <Indicator
            label="Emendas na saúde"
            value={fmtCompact(totalEmendas)}
            note={emendasSubtext}
          />
          <Indicator
            label="Contratos vinculados"
            value={saude.orcamento.contratosVinculadosCount}
          />
          <Indicator
            label="Fornecedores ativos"
            value={saude.orcamento.fornecedoresAtivosCount}
          />
          <Indicator
            label="Medicamentos e insumos"
            value={fmtCompact(saude.orcamento.medicamentosInsumos)}
            note="reservados (empenhados) em medicamentos. Compras lançadas como “outros materiais para distribuição gratuita” não entram e podem incluir remédios."
          />
        </IndicatorPanel>
      </div>

      {/* Alerta de Subexecução se aplicável (apenas exercícios encerrados) */}
      {saude.orcamento.alertaSubExecucao && (
        <AlertBox type="warning" title="Alerta de Subexecução Orçamentária">
          A execução da Saúde encerrou o exercício abaixo de 70% da dotação
          aprovada.
        </AlertBox>
      )}

      {/* Seção 2: O que entrou no Fundo (Existente) */}
      <section className="space-y-6">
        <SectionHeader title="O que entrou" />
        <SaudeOrigemRecursos fontes={saude.fontesReceita} ano={selectedYear} />
      </section>

      {/* Seção 3: Empenhado no ano (Existente) */}
      <section className="space-y-6">
        <SectionHeader title="Como mudou ao longo dos anos" />
        <SaudeEvolucaoAnual
          data={saude.executionTrend}
          selectedYear={selectedYear}
          partialYear={isCurrentYear ? selectedYear : undefined}
          partialPeriod={partialPeriod}
        />
      </section>

      {/* Seção 4: Como o Fundo contrata (Novo) */}
      <SaudeContratacaoSection
        portalSlug={portalSlug}
        ano={selectedYear}
        orcamento={saude.orcamento}
        licitacoesSaude={saude.licitacoesSaude}
        licitacoesEmAndamento={saude.licitacoesEmAndamento}
        itensByLicitacao={saude.itensByLicitacao}
      />

      {/* Seção 5: Quem recebe o dinheiro da saúde */}
      <section className="space-y-6">
        <SectionHeader title="Quem recebe o dinheiro da saúde" />
        {fornecedoresLinhas.length > 0 ? (
          <>
            <IndicatorPanel columns={2}>
              <Indicator
                label={`Parte do total pago que foi para os ${fornecedoresLinhas.length} maiores fornecedores`}
                value={fmtPercent(concentracaoTopFornecedores)}
                note={`do que o Fundo pagou em ${selectedYear}`}
              />
              <Indicator
                label={`Pago aos ${fornecedoresLinhas.length} maiores fornecedores`}
                value={fmtCompact(valorPagoTopFornecedores)}
                note={`de ${fmtCompact(saude.orcamento.pago)} pagos pelo Fundo`}
              />
            </IndicatorPanel>
            <DespesasFornecedoresSection
              fornecedores={fornecedoresLinhas}
              portalSlug={portalSlug}
              ano={selectedYear}
              nota="Consórcios de saúde e contratos grandes naturalmente concentram valores. O valor mostra o que foi pago, não se o preço foi justo."
            />
          </>
        ) : (
          <p className="border-line border-y py-4 text-mute">
            Sem pagamentos a fornecedores registrados para a saúde em{" "}
            {selectedYear}.
          </p>
        )}
      </section>

      {/* Seção 6: Emendas parlamentares destinadas à Saúde (Existente, com mais detalhes) */}
      <SaudeEmendasSection
        ano={selectedYear}
        emendasStats={saude.emendasStats}
        portalSlug={portalSlug}
      />
    </div>
  );
}
