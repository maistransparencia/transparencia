"use client";

import { DenseTable, SectionHeader } from "@transparencia/ui";

export interface AnnualActuarialTrend {
  ano: number;
  aporteExigido: number;
  aporteQuitado: number;
  taxaAdimplencia: number;
  amortizacaoDivida: number;
}

export interface CadprevParcelamentoItem {
  numeroCadprev: string;
  descricao: string;
  elemento: string;
  empenhado: number;
  pago: number;
  dataEmpenho?: string;
}

export interface PrevidenciaActuarialRiskSectionProps {
  ano: number;
  trend?: AnnualActuarialTrend[];
  cadprev?: CadprevParcelamentoItem[];
  className?: string;
  previdenciaSigla?: string;
}

export function PrevidenciaActuarialRiskSection({
  ano,
  trend = [],
  cadprev = [],
  className,
  previdenciaSigla = "RPPS",
}: PrevidenciaActuarialRiskSectionProps) {
  const trendCols = [
    { header: "Exercício", accessorKey: "ano" as const },
    {
      header: "Aporte exigido",
      accessorKey: "aporteExigido" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Aporte pago",
      accessorKey: "aporteQuitado" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Adimplência",
      accessorKey: "taxaAdimplencia" as const,
      align: "right" as const,
      format: "percent" as const,
    },
    {
      header: "Dívida amortizada",
      accessorKey: "amortizacaoDivida" as const,
      align: "right" as const,
      format: "currency" as const,
    },
  ];

  const cadprevCols = [
    {
      header: "Registro CADPREV",
      accessorKey: "numeroCadprev" as const,
    },
    {
      header: "Objeto do parcelamento",
      accessorKey: "descricao" as const,
      className: "max-w-sm",
    },
    {
      header: "Empenhado",
      accessorKey: "empenhado" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Pago / Quitado",
      accessorKey: "pago" as const,
      align: "right" as const,
      format: "currency" as const,
    },
  ];

  const anosDaSerie = trend.map((ponto) => ponto.ano);
  const anoMin = Math.min(...anosDaSerie);
  const anoMax = Math.max(...anosDaSerie);
  const intervaloDaSerie =
    anoMin === anoMax ? `${anoMin}` : `${anoMin}–${anoMax}`;

  return (
    <section id="cadprev" className={`space-y-6 ${className || ""}`}>
      <SectionHeader
        title={`Quanto a Prefeitura pagou em ${ano} de dívidas parceladas com o fundo de aposentadoria?`}
        description="Acordos em que a Prefeitura parcelou dívidas previdenciárias com o fundo de aposentadoria, registrados no CADPREV (Ministério da Previdência), e o cumprimento histórico dos aportes atuariais."
      />

      {/* Tabela de Acordos de Confissão e Parcelamento no CADPREV */}
      <div className="space-y-3">
        {cadprev.length > 0 ? (
          <DenseTable
            data={cadprev}
            columns={cadprevCols}
            searchableKeys={["numeroCadprev", "descricao"]}
            exportFilename={`cadprev-parcelamentos-${ano}.csv`}
          />
        ) : (
          <div className="border-line text-mute border-y py-4 text-center text-xs">
            Nenhum termo de parcelamento ou confissão de dívida registrado no
            CADPREV em {ano}.
          </div>
        )}
        <p className="text-mute text-xs">
          Não inclui multas ou penalidades tributárias pagas a outros credores
          (ex: Receita Federal), mesmo quando relacionadas à contribuição
          previdenciária — apenas acordos formais junto ao {previdenciaSigla}.
        </p>
      </div>

      {/* Tabela Histórica da Adimplência do Aporte Atuarial */}
      {trend.length > 0 && (
        <div className="space-y-3">
          <h3>
            {`Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas (${intervaloDaSerie})`}
          </h3>
          <p className="text-mute text-xs">
            O aporte exigido é uma estimativa: segue o cálculo atuarial do
            fundo, não é um valor medido. O aporte efetuado é o que foi
            realmente pago.
          </p>
          <DenseTable
            data={trend}
            columns={trendCols}
            enableExportCsv={false}
          />
        </div>
      )}
    </section>
  );
}
