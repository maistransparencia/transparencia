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
import { EducacaoMemoriaCalculo } from "@/components/educacao/educacao-memoria-calculo";
import { EducacaoMinimosLegaisSection } from "@/components/educacao/educacao-minimos-legais-section";
import { EducacaoOrigemRecursosSection } from "@/components/educacao/educacao-origem-recursos-section";
import { EducacaoTresRespostasSection } from "@/components/educacao/educacao-tres-respostas-section";
import { EducacaoValorPorAlunoSection } from "@/components/educacao/educacao-valor-por-aluno-section";
import { EmendasSection } from "@/components/emendas-section";
import { EvolucaoAnual } from "@/components/evolucao-anual";
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

  const emendasSubtext = (() => {
    if (emendas.totalAutorizado <= 0) {
      return "Nenhuma emenda destinada no exercício";
    }
    if (emendas.totalEmpenhado === 0) {
      return "Ainda sem valor reservado informado no cadastro de emendas";
    }
    return `${fmtCompact(emendas.totalEmpenhado)} já reservados (${fmtPercent(emendas.taxaEmpenho * 100)})`;
  })();

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

  return (
    <div className="space-y-12 pb-12">
      <div className="space-y-8">
        <EducacaoHeroSection
          ano={selectedYear}
          isCurrentYear={isCurrentYear}
          partialPeriod={partialPeriod}
        />
        <EducacaoTresRespostasSection
          minimosLegais={viewModel.minimosLegais}
          valorPorAluno={viewModel.valorPorAluno}
          aprendizado={viewModel.aprendizado.anosIniciais}
        />
      </div>

      <div className="space-y-4">
        <EducacaoMinimosLegaisSection minimosLegais={viewModel.minimosLegais} />
        <EducacaoMemoriaCalculo
          ano={selectedYear}
          isCurrentYear={isCurrentYear}
          partialPeriod={partialPeriod}
          execucao={execucao}
        />
      </div>

      <EducacaoValorPorAlunoSection valorPorAluno={viewModel.valorPorAluno} />

      <EducacaoAprendizadoSection
        aprendizado={viewModel.aprendizado}
        historico={viewModel.historico}
        initialEtapa={viewModel.selectedEtapa}
      />

      <IndicatorPanel columns={2}>
        <Indicator
          label="Emendas na educação"
          value={
            emendas.totalAutorizado > 0
              ? fmtCompact(emendas.totalAutorizado)
              : "—"
          }
          note={emendasSubtext}
        />
        <Indicator
          label="Contratos do Fundo"
          value={contratos.length}
          note={`contratos em vigor em ${selectedYear}`}
        />
      </IndicatorPanel>

      {emendas.lista.length > 0 && (
        <EmendasSection
          ano={selectedYear}
          emendasStats={emendas}
          portalSlug={viewModel.portalSlug}
          titulo="Emendas na educação"
          descricao="Recursos que deputados e senadores destinaram à educação do município."
        />
      )}

      {viewModel.origemRecursos && (
        <EducacaoOrigemRecursosSection
          origemRecursos={viewModel.origemRecursos}
        />
      )}

      <section className="space-y-6">
        <SectionHeader
          title="Como mudou ao longo dos anos"
          description={`Quanto a Prefeitura reservou (empenhado) e quanto já pagou em educação em cada ano. Reservar não é pagar: a diferença é o que ainda não saiu do caixa.${
            isCurrentYear
              ? ` O ano de ${selectedYear} está em andamento${partialPeriod ? ` (${partialPeriod})` : ""} e não deve ser comparado com anos completos.`
              : ""
          }`}
        />
        <EvolucaoAnual
          data={viewModel.serieAnual}
          selectedYear={selectedYear}
          partialYear={isCurrentYear ? selectedYear : undefined}
          mensagemVazia="Sem execução da educação registrada para comparar os anos."
        />
      </section>

      <EducacaoContratosSection
        contratos={contratos}
        totaisPorCategoria={viewModel.contratosResumo.totaisPorCategoria}
        initialContratoNumero={resolvedSearchParams.contratoNumero}
        portalSlug={viewModel.portalSlug}
        ano={selectedYear}
      />

      <section className="space-y-6">
        <SectionHeader title="Quem recebe o dinheiro da educação" />
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
              nota="O valor mostra o que foi pago, não se o preço foi justo."
            />
          </>
        ) : (
          <p className="border-line border-y py-4 text-mute">
            Sem pagamentos a fornecedores registrados para a educação em{" "}
            {selectedYear}.
          </p>
        )}
      </section>
    </div>
  );
}
