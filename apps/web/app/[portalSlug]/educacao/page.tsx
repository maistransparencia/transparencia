import { resumirFiscalizacaoEducacao } from "@transparencia/db";
import {
  fmtCompact,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import type { Metadata } from "next";
import { buildFornecedoresLinhas } from "@/app/[portalSlug]/despesas/view-model";
import { DespesasFornecedoresSection } from "@/components/despesas-fornecedores-section";
import { EducacaoAprendizadoSection } from "@/components/educacao/educacao-aprendizado-section";
import { EducacaoContratosSection } from "@/components/educacao/educacao-contratos-section";
import { EducacaoHeroSection } from "@/components/educacao/educacao-hero-section";
import { EducacaoOrigemRecursosSection } from "@/components/educacao/educacao-origem-recursos-section";
import { EmendasSection } from "@/components/emendas-section";
import { EvolucaoAnual } from "@/components/evolucao-anual";
import { SectionWithHeader } from "@/components/section-with-header";
import { createPortalMetadata } from "@/lib/metadata";
import { loadEducacaoData } from "./loader";
import { buildEducacaoViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface EducacaoPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{
    ano?: string;
    etapa?: string;
    contratoNumero?: string;
    busca?: string;
    categoria?: string;
  }>;
}

export async function generateMetadata({
  params,
}: EducacaoPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Educação Básica", portalSlug, {
    description:
      "A Prefeitura aplica o mínimo exigido em educação, quanto investe por aluno e se as crianças estão aprendendo (IDEB), com a origem do dinheiro e quem recebe.",
    path: "/educacao",
    keywords: [
      "educação",
      "IDEB",
      "SAEB",
      "merenda escolar PNAE",
      "transporte escolar PNATE",
    ],
  });
}

export default async function EducacaoPage({
  params,
  searchParams,
}: EducacaoPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;

  const rawData = await loadEducacaoData(portalSlug, resolvedSearchParams);
  const viewModel = buildEducacaoViewModel(rawData);
  const {
    selectedYear,
    isCurrentYear,
    partialPeriod,
    execucao,
    emendas,
    contratos,
  } = viewModel;

  const fornecedoresLinhas = buildFornecedoresLinhas(
    viewModel.topFornecedores,
    execucao.pagoSemPessoal,
  );
  const valorPagoTopFornecedores = fornecedoresLinhas.reduce(
    (total, fornecedor) => total + fornecedor.valorPago,
    0,
  );
  const concentracaoTopFornecedores = fornecedoresLinhas.reduce(
    (total, fornecedor) => total + fornecedor.percentualTotalPago,
    0,
  );

  const resumo = resumirFiscalizacaoEducacao({
    emendas,
    contratos,
    topFornecedores: viewModel.topFornecedores,
  });
  const pluralizar = (quantidade: number, singular: string, plural: string) =>
    `${quantidade} ${quantidade === 1 ? singular : plural}`;
  const resumoEmendas = `${pluralizar(resumo.emendas.quantidade, "emenda", "emendas")} · ${fmtCompact(resumo.emendas.totalAutorizado)} autorizados`;
  const resumoCategorias =
    resumo.contratos.quantidade > 0
      ? "Contratos vigentes, separados por tipo de gasto"
      : "Nenhum contrato vigente";
  const resumoContratos = `${pluralizar(resumo.contratos.quantidade, "contrato", "contratos")} · ${fmtCompact(resumo.contratos.valorTotalContratos)} contratados, sem contar acréscimos`;
  const resumoFornecedores = `${pluralizar(resumo.fornecedores.quantidade, "fornecedor", "maiores fornecedores")} · ${fmtCompact(resumo.fornecedores.totalPago)} pagos`;

  return (
    <div className="space-y-12 pb-12">
      <div className="space-y-8">
        <EducacaoHeroSection
          ano={selectedYear}
          isCurrentYear={isCurrentYear}
          partialPeriod={partialPeriod}
          minimosLegais={viewModel.minimosLegais}
          execucao={execucao}
          portalUrl={viewModel.portalUrl}
          valorPorAluno={viewModel.valorPorAluno}
          alunosRede={viewModel.alunosRede ?? null}
          aprendizado={viewModel.aprendizado.anosIniciais}
        />
      </div>

      <EducacaoAprendizadoSection
        aprendizado={viewModel.aprendizado}
        historico={viewModel.historico}
        initialEtapa={viewModel.selectedEtapa}
      />

      {viewModel.origemRecursos && (
        <EducacaoOrigemRecursosSection
          origemRecursos={viewModel.origemRecursos}
        />
      )}

      <section id="evolucao-educacao" className="space-y-6">
        <SectionHeader
          title="Como mudou ao longo dos anos"
          description="Quanto a Prefeitura reservou (empenhado) e quanto já pagou em educação em cada ano. Reservar não é pagar: a diferença é o que ainda não saiu do caixa."
        />
        <EvolucaoAnual
          data={viewModel.serieAnual}
          selectedYear={selectedYear}
          partialYear={isCurrentYear ? selectedYear : undefined}
          mensagemVazia="Sem execução da educação registrada para comparar os anos."
        />
      </section>

      <div id="para-fiscalizar" className="scroll-mt-20 space-y-2">
        <SectionHeader
          title="Para fiscalizar"
          description={`Para quem quer conferir ${emendas.lista.length > 0 ? "emenda por emenda, " : ""}contrato por contrato e fornecedor por fornecedor. Toque ou clique em cada parte para abrir.`}
        />

        {emendas.lista.length > 0 && (
          <EmendasSection
            id="emendas-educacao"
            resumo={resumoEmendas}
            ano={selectedYear}
            emendasStats={emendas}
            portalSlug={viewModel.portalSlug}
            titulo="Emendas na educação"
            descricao="Recursos que deputados e senadores destinaram à educação do município."
          />
        )}

        <EducacaoContratosSection
          contratos={contratos}
          totaisPorCategoria={viewModel.contratosResumo.totaisPorCategoria}
          initialContratoNumero={resolvedSearchParams.contratoNumero}
          resumoCategorias={resumoCategorias}
          resumoContratos={resumoContratos}
          portalSlug={viewModel.portalSlug}
          ano={selectedYear}
        />

        <SectionWithHeader
          id="fornecedores-educacao"
          title="Quem recebe o dinheiro da educação"
          summary={
            fornecedoresLinhas.length > 0
              ? resumoFornecedores
              : "Sem pagamentos a fornecedores registrados"
          }
        >
          {fornecedoresLinhas.length > 0 ? (
            <>
              <IndicatorPanel columns={2}>
                <Indicator
                  label={`Parte do total pago que foi para os ${fornecedoresLinhas.length} maiores fornecedores`}
                  value={fmtPercent(concentracaoTopFornecedores)}
                  note={`do que a Prefeitura pagou em educação em ${selectedYear}, sem contar salários`}
                />
                <Indicator
                  label={`Pago aos ${fornecedoresLinhas.length} maiores fornecedores`}
                  value={fmtCompact(valorPagoTopFornecedores)}
                  note={`de ${fmtCompact(execucao.pagoSemPessoal)} pagos em educação, sem contar salários`}
                />
              </IndicatorPanel>
              <DespesasFornecedoresSection
                fornecedores={fornecedoresLinhas}
                portalSlug={portalSlug}
                ano={selectedYear}
                nota={null}
              />
            </>
          ) : (
            <p className="border-line border-y py-4 text-mute">
              Sem pagamentos a fornecedores registrados para a educação em{" "}
              {selectedYear}.
            </p>
          )}
        </SectionWithHeader>
      </div>
    </div>
  );
}
