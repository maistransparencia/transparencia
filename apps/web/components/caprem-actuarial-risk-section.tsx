"use client";

import { DenseTable } from "@transparencia/ui";
import { SectionHeader } from "@/components/section-header";

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

export interface CapremActuarialRiskSectionProps {
  ano: number;
  trend?: AnnualActuarialTrend[];
  cadprev?: CadprevParcelamentoItem[];
  className?: string;
}

export function CapremActuarialRiskSection({
  ano,
  trend = [],
  cadprev = [],
  className,
}: CapremActuarialRiskSectionProps) {
  const trendCols = [
    { header: "Exercício / Ano", accessorKey: "ano" as const },
    {
      header: "Aporte Atuarial Exigido",
      accessorKey: "aporteExigido" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Aporte Efetuado / Quitado",
      accessorKey: "aporteQuitado" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Índice de Adimplência",
      accessorKey: "taxaAdimplencia" as const,
      align: "right" as const,
      format: "percent" as const,
    },
    {
      header: "Amortização de Dívida / Parcelamento",
      accessorKey: "amortizacaoDivida" as const,
      align: "right" as const,
      format: "currency" as const,
    },
  ];

  const cadprevCols = [
    {
      header: "Registro CADPREV / Ministério da Previdência",
      accessorKey: "numeroCadprev" as const,
      className: "max-w-[200px]",
    },
    {
      header: "Objeto do Termo de Parcelamento",
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

  return (
    <section id="cadprev" className={`space-y-6 ${className || ""}`}>
      <SectionHeader
        title="Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)"
        description="Monitoramento dos acordos formais de confissão e parcelamento de dívidas previdenciárias firmados junto ao Ministério da Previdência (CADPREV) e cumprimento histórico dos aportes atuariais."
      />

      {/* Tabela de Acordos de Confissão e Parcelamento no CADPREV */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold font-serif text-slate-800 text-sm">
            Acordos Oficiais de Confissão e Parcelamento de Dívidas (CADPREV /
            Ministério da Previdência)
          </h3>
        </div>

        {cadprev.length > 0 ? (
          <DenseTable
            data={cadprev}
            columns={cadprevCols}
            searchableKeys={["numeroCadprev", "descricao"]}
            exportFilename={`cadprev-parcelamentos-${ano}.csv`}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 border-dashed bg-slate-50/50 p-6 text-center text-mutedText text-xs">
            Nenhum termo de parcelamento ou confissão de dívida registrado no
            CADPREV para o exercício de {ano}.
          </div>
        )}
        <p className="text-mutedText text-xs">
          Não inclui multas ou penalidades tributárias pagas a outros credores
          (ex: Receita Federal), mesmo quando relacionadas à contribuição
          previdenciária — apenas acordos formais junto ao CAPREM.
        </p>
      </div>

      {/* Tabela Histórica da Adimplência do Aporte Atuarial */}
      {trend.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold font-serif text-slate-800 text-sm">
            Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas
            (2021–2026)
          </h3>
          <DenseTable
            data={trend}
            columns={trendCols}
            searchableKeys={["ano"]}
            exportFilename="cobertura-atuarial-historica.csv"
          />
        </div>
      )}
    </section>
  );
}
