import {
  getComparacaoReceitaEstadual,
  getEmendasEstaduais,
  getFontesEmendas,
  resumirFiscalizacaoSaude,
} from "@transparencia/db";
import {
  AlertBox,
  fmtCompact,
  fmtDate,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import type { Metadata } from "next";
import { buildFornecedoresLinhas } from "@/app/[portalSlug]/despesas/view-model";
import { DespesasFornecedoresSection } from "@/components/despesas-fornecedores-section";
import { EmendasSection } from "@/components/emendas-section";
import { EvolucaoAnual } from "@/components/evolucao-anual";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { SaudeProducaoSus } from "@/components/saude/saude-producao-sus";
import { SaudeRedePorMilMoradores } from "@/components/saude/saude-rede-por-mil-moradores";
import { SaudeContratacaoSection } from "@/components/saude-contratacao-section";
import { SaudeHeroSection } from "@/components/saude-hero-section";
import { SaudeOrigemRecursos } from "@/components/saude-origem-recursos";
import { SectionWithHeader } from "@/components/section-with-header";
import { createPortalMetadata } from "@/lib/metadata";
import { loadSaudeData } from "./loader";
import { buildSaudeViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface SaudePageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string; numero?: string }>;
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
  const {
    selectedYear,
    isCurrentYear,
    partialPeriod,
    minimoSaude,
    redePorMilMoradores,
    producaoSus,
    farmaciaResumo,
    portalUrl,
    dataColeta,
    saude,
  } = viewModel;
  const [emendasEstaduais, comparacaoReceitaEstadual] = await Promise.all([
    getEmendasEstaduais(portalSlug, selectedYear, "saude"),
    getComparacaoReceitaEstadual(portalSlug, selectedYear),
  ]);
  const fontesEmendas = await getFontesEmendas(
    portalSlug,
    selectedYear,
    emendasEstaduais,
  );

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

  const resumo = resumirFiscalizacaoSaude({
    emendas: saude.emendasStats,
    caminhosContratacao: saude.licitacoesSaude.caminhos,
    quantidadeLicitacoesEmAndamento: saude.licitacoesEmAndamento?.length ?? 0,
    topFornecedores: saude.topFornecedores ?? [],
    totalPagoFundo: saude.orcamento.pago,
  });
  const pluralizar = (quantidade: number, singular: string, plural: string) =>
    `${quantidade} ${quantidade === 1 ? singular : plural}`;
  const resumoEmendas = `${pluralizar(resumo.emendas.quantidade, "emenda", "emendas")} · ${fmtCompact(resumo.emendas.totalAutorizado)} autorizados${emendasEstaduais.emendas.length > 0 ? ` · ${emendasEstaduais.emendas.length} do Estado` : ""}`;
  const resumoContratacao = `${pluralizar(resumo.contratacao.quantidadeLicitacoesProprias, "licitação própria", "licitações próprias")} · ${fmtCompact(resumo.contratacao.totalEmpenhadoLicitacoesProprias)} empenhados · ${resumo.contratacao.quantidadeLicitacoesEmAndamento} em andamento`;
  const resumoFornecedores = `${pluralizar(resumo.fornecedores.quantidade, "fornecedor", "maiores fornecedores")} · ${fmtCompact(resumo.fornecedores.totalPago)} pagos (${fmtPercent(resumo.fornecedores.percentualTotalPago)} do total)`;

  return (
    <div className="space-y-12 pb-12">
      <SaudeHeroSection
        ano={selectedYear}
        isCurrentYear={isCurrentYear}
        partialPeriod={partialPeriod}
        portalSlug={portalSlug}
        orcamento={saude.orcamento}
        minimoSaude={minimoSaude}
        fontesReceita={saude.fontesReceita}
        redePorMilMoradores={redePorMilMoradores}
        farmacia={farmaciaResumo}
        portalUrl={portalUrl || null}
        dataColeta={dataColeta || null}
        resumoFiscalizacao={[
          resumoEmendas,
          resumoContratacao,
          resumoFornecedores,
        ]}
      />

      {/* Alerta de Subexecução se aplicável (apenas exercícios encerrados) */}
      {saude.orcamento.alertaSubExecucao && (
        <AlertBox type="warning" title="Alerta de Subexecução Orçamentária">
          A execução da Saúde encerrou o exercício abaixo de 70% da dotação
          aprovada.
        </AlertBox>
      )}

      {/* Seção 2: O que entrou no Fundo (Existente) */}
      <section id="o-que-entrou" className="scroll-mt-20 space-y-6">
        <SectionHeader
          title="O que entrou"
          description={
            saude.fontesReceita.totalEntrada > 0
              ? `Em ${selectedYear}, entraram ${fmtCompact(saude.fontesReceita.totalEntrada)} no Fundo Municipal de Saúde. ${saude.fontesReceita.percentualUniaoSus} de cada R$ 100 vêm do Governo Federal. Veja de onde veio cada parte.`
              : undefined
          }
        />
        <SaudeOrigemRecursos fontes={saude.fontesReceita} ano={selectedYear} />
        {portalUrl && (
          <LinhaLeiEFonte
            source={
              <LeiLink
                label="Portal da Transparência da Prefeitura"
                url={portalUrl}
              />
            }
            extra={
              dataColeta ? `Coletado em ${fmtDate(dataColeta)}` : undefined
            }
          />
        )}
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
        <EvolucaoAnual
          data={saude.executionTrend}
          selectedYear={selectedYear}
          partialYear={isCurrentYear ? selectedYear : undefined}
          mensagemVazia="Sem execução da saúde registrada para comparar os anos."
        />
      </section>

      <SaudeRedePorMilMoradores rede={redePorMilMoradores} />

      <SaudeProducaoSus producao={producaoSus} />

      <div id="para-fiscalizar" className="scroll-mt-20 space-y-2">
        <SectionHeader
          title="Para fiscalizar"
          description="Para conferir como o Fundo contrata, fornecedor por fornecedor e emenda por emenda."
        />

        {/* Seção 4: Como o Fundo contrata (Novo) */}
        <SaudeContratacaoSection
          portalSlug={portalSlug}
          ano={selectedYear}
          orcamento={saude.orcamento}
          licitacoesSaude={saude.licitacoesSaude}
          licitacoesEmAndamento={saude.licitacoesEmAndamento}
          itensByLicitacao={saude.itensByLicitacao}
          resumo={resumoContratacao}
          defaultOpen={Boolean(resolvedSearchParams.numero)}
        />

        {/* Seção 5: Quem recebe o dinheiro da saúde */}
        <SectionWithHeader
          id="fornecedores-saude"
          title="Quem recebe o dinheiro da saúde"
          summary={
            fornecedoresLinhas.length > 0
              ? resumoFornecedores
              : "Nenhum pagamento a fornecedores"
          }
        >
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
        </SectionWithHeader>

        {/* Seção 6: Emendas parlamentares destinadas à Saúde (Existente, com mais detalhes) */}
        <EmendasSection
          id="emendas-saude"
          resumo={resumoEmendas}
          ano={selectedYear}
          emendasStats={saude.emendasStats}
          portalSlug={portalSlug}
          emendasEstaduais={emendasEstaduais}
          comparacaoReceitaEstadual={comparacaoReceitaEstadual}
          fontes={fontesEmendas}
        />
      </div>
    </div>
  );
}
