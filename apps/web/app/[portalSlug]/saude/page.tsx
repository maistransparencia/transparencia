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
      return "Empenho ainda não informado no cadastro de emendas";
    }
    return `${fmtCompact(totalEmpenhado)} empenhados no cadastro (${fmtPercent(taxaEmpenho * 100)})`;
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
        />

        <IndicatorPanel columns={4}>
          <Indicator
            label="Medicamentos e insumos"
            value={fmtCompact(saude.orcamento.medicamentosInsumos)}
            note="reservados (empenhados) em medicamentos e outros materiais distribuídos gratuitamente ao cidadão"
          />
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
        <SectionHeader
          title="O que entrou"
          description={
            saude.fontesReceita.totalEntrada > 0
              ? `Em ${selectedYear}, entraram ${fmtCompact(saude.fontesReceita.totalEntrada)} no Fundo Municipal de Saúde. ${saude.fontesReceita.uniaoSusPct} de cada R$ 100 vêm do Governo Federal, pelo SUS (Sistema Único de Saúde). Veja de onde veio cada parte.`
              : undefined
          }
        />
        <SaudeOrigemRecursos fontes={saude.fontesReceita} ano={selectedYear} />
      </section>

      {/* Seção 3: Empenhado no ano (Existente) */}
      <section className="space-y-6">
        <SectionHeader
          title="Como mudou ao longo dos anos"
          description={`Quanto o Fundo reservou (empenhado) e quanto já pagou em cada ano. Reservar não é pagar: a diferença é o que ainda não saiu do caixa.${
            isCurrentYear
              ? ` O ano de ${selectedYear} está em andamento${partialPeriod ? ` (${partialPeriod})` : ""} e não deve ser comparado com anos completos.`
              : ""
          }`}
        />
        <SaudeEvolucaoAnual
          data={saude.executionTrend}
          selectedYear={selectedYear}
          partialYear={isCurrentYear ? selectedYear : undefined}
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
