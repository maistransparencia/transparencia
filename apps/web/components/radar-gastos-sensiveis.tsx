"use client";

import type {
  CATEGORIAS_GASTOS_SENSIVEIS,
  EntidadeDividaItemDTO,
} from "@transparencia/db";
import {
  type Column,
  DenseTable,
  fmtCompact,
  fmtCurrency,
} from "@transparencia/ui";
import {
  Building2,
  Fuel,
  Hammer,
  PartyPopper,
  Plane,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";

import { ShowYourWorkButton } from "./show-your-work-button";

export interface ItemGastoSensivel {
  categoria: (typeof CATEGORIAS_GASTOS_SENSIVEIS)[number];
  valorPagoAnoAtual: number;
  valorPagoAnoAnterior: number;
  valorLiquidadoAnoAtual?: number;
  valorEmpenhadoAnoAtual?: number;
  valorLiquidadoPendente?: number;
  dividaRealAcumulada?: number;
  dividaRestosAcumulada?: number;
  variacaoPercentual: number | null;
  tendencia: "aumento" | "economia" | "estavel" | "sem_historico";
  decomposicaoDivida?: EntidadeDividaItemDTO[];
}

export type RadarIcon =
  | "fuel"
  | "truck"
  | "building"
  | "party"
  | "plane"
  | "hammer";

export interface RadarGastosSensiveisProps {
  itens: ItemGastoSensivel[];
  anoAtual: number;
  anoAnterior: number;
  portalSlug?: string;
  entidades?: string;
  totalDespesasPagas?: number;
  className?: string;
}

const CATEGORIA_CONFIG: Record<
  (typeof CATEGORIAS_GASTOS_SENSIVEIS)[number],
  {
    titulo: string;
    descricao: string;
    icone: RadarIcon;
  }
> = {
  combustivel_frota: {
    titulo: "Combustíveis & Frotas",
    descricao: "Abastecimento e manutenção de veículos e maquinários",
    icone: "fuel",
  },
  locacao_maquinas_veiculos: {
    titulo: "Locação de Máquinas & Veículos",
    descricao: "Aluguel de automóveis e maquinários pesados de terceiros",
    icone: "truck",
  },
  locacao_imoveis: {
    titulo: "Locação de Imóveis",
    descricao:
      "Aluguel de prédios, salas, galpões e terrenos para órgãos públicos",
    icone: "building",
  },
  eventos_festas: {
    titulo: "Eventos, Shows & Festividades",
    descricao: "Contratação artística, palcos, iluminação e festas",
    icone: "party",
  },
  diarias_viagens: {
    titulo: "Diárias & Viagens a Serviço",
    descricao: "Reembolsos e deslocamentos de servidores e agentes",
    icone: "plane",
  },
  obras_infraestrutura: {
    titulo: "Obras & Infraestrutura",
    descricao: "Investimentos em pavimentação, reformas e construções",
    icone: "hammer",
  },
};

const ICONES = {
  fuel: Fuel,
  truck: Truck,
  building: Building2,
  party: PartyPopper,
  plane: Plane,
  hammer: Hammer,
} as const;

const formatarPercentual = (valor: number) =>
  `${valor.toFixed(1).replace(".", ",")}%`;

interface LinhaRadar {
  categoria: ItemGastoSensivel["categoria"];
  titulo: string;
  icone: RadarIcon;
  valorPago: number;
  percentualPago: number;
  larguraBarra: number;
  dividaReal: number;
  decomposicao: EntidadeDividaItemDTO[];
  variacaoPercentual: number | null;
  tendencia: ItemGastoSensivel["tendencia"];
}

function BarraProporcao({
  percentual,
  className,
  trilhaClassName = "bg-track",
}: {
  percentual: number;
  className: string;
  trilhaClassName?: string;
}) {
  const largura = Math.min(100, Math.max(0, percentual));
  return (
    <span className={`block h-1.5 w-full overflow-hidden ${trilhaClassName}`}>
      <span
        className={`block h-full ${className}`}
        style={{ width: `${largura}%` }}
      />
    </span>
  );
}

function DecomposicaoDivida({
  linha,
  baixarRegistros,
}: {
  linha: LinhaRadar;
  baixarRegistros?: React.ReactNode;
}) {
  if (linha.dividaReal <= 0) {
    return (
      <div className="space-y-3">
        <p className="text-mute2 text-xs">
          Não há contas pendentes desta categoria nas entidades selecionadas.
        </p>
        {baixarRegistros}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-ink text-xs font-semibold">
          Decomposição da dívida real
        </p>
        <span className="text-ink text-right text-sm font-bold tabular-nums">
          {fmtCurrency(linha.dividaReal)}
        </span>
      </div>
      <ul>
        {linha.decomposicao.map((entidade) => (
          <li
            key={entidade.empresaId}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 py-3"
          >
            <span className="text-ink text-sm font-medium">
              {entidade.entidadeNome}
              <span className="text-mute2 ml-2 text-xs">
                {formatarPercentual(entidade.percentual)}
              </span>
            </span>
            <span className="text-ink text-right text-sm tabular-nums">
              {fmtCurrency(entidade.valorDivida)}
            </span>
            <span className="col-span-full">
              <BarraProporcao
                percentual={Math.max(entidade.percentual, 1)}
                className="bg-warn-fill"
              />
            </span>
          </li>
        ))}
      </ul>
      {baixarRegistros}
      <p className="text-mute2 max-w-[70ch] text-xs leading-relaxed">
        A dívida real compreende empenhos liquidados do exercício ainda não
        pagos, somados aos Restos a Pagar de anos anteriores.
      </p>
    </div>
  );
}

function VariacaoBadge({
  linha,
  anoAnterior,
}: {
  linha: LinhaRadar;
  anoAnterior: number;
}) {
  const { variacaoPercentual, tendencia } = linha;
  if (variacaoPercentual === null) {
    return (
      <span className="bg-pill text-mute2 shrink-0 rounded-sm px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
        Sem histórico
      </span>
    );
  }
  if (tendencia === "aumento") {
    return (
      <span className="border-warn-text text-warn-text inline-flex shrink-0 items-center gap-1 rounded-sm border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />+
        {variacaoPercentual}% vs {anoAnterior}
      </span>
    );
  }
  if (tendencia === "economia") {
    return (
      <span className="border-ok-text text-ok-text inline-flex shrink-0 items-center gap-1 rounded-sm border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
        {variacaoPercentual}% vs {anoAnterior}
      </span>
    );
  }
  const sinal = variacaoPercentual > 0 ? "+" : "";
  return (
    <span className="bg-pill text-mute2 shrink-0 rounded-sm px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
      {sinal}
      {variacaoPercentual}% vs {anoAnterior}
    </span>
  );
}

function ValorDivida({ valor }: { valor: number }) {
  if (valor <= 0) {
    return <span className="text-mute2 text-xs">Nada pendente</span>;
  }
  return (
    <span className="text-warn-text font-bold tabular-nums">
      {fmtCompact(valor)}
    </span>
  );
}

export function RadarGastosSensiveis({
  itens,
  anoAtual,
  anoAnterior,
  portalSlug,
  entidades,
  totalDespesasPagas = 0,
  className = "",
}: RadarGastosSensiveisProps) {
  if (!itens || itens.length === 0) return null;

  const linhas: LinhaRadar[] = itens.map((item) => {
    const config = CATEGORIA_CONFIG[item.categoria] ?? {
      titulo: item.categoria,
      descricao: "",
      icone: "fuel" as const,
    };
    const percentualPago =
      totalDespesasPagas > 0
        ? (item.valorPagoAnoAtual / totalDespesasPagas) * 100
        : 0;
    return {
      categoria: item.categoria,
      titulo: config.titulo,
      icone: config.icone,
      valorPago: item.valorPagoAnoAtual,
      percentualPago,
      larguraBarra: 0,
      dividaReal: item.dividaRealAcumulada ?? item.valorLiquidadoPendente ?? 0,
      decomposicao: item.decomposicaoDivida ?? [],
      variacaoPercentual: item.variacaoPercentual,
      tendencia: item.tendencia,
    };
  });

  const maiorPercentual = Math.max(...linhas.map((l) => l.percentualPago));
  const linhasComBarra = linhas.map((linha) => ({
    ...linha,
    larguraBarra:
      maiorPercentual > 0 ? (linha.percentualPago / maiorPercentual) * 100 : 0,
  }));

  const renderCategoria = (linha: LinhaRadar) => {
    const Icone = ICONES[linha.icone] ?? Fuel;
    return (
      <div className="flex items-center gap-3">
        <span className="border-line flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border">
          <Icone className="text-brand h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-ink min-w-0 flex-1 text-sm font-bold whitespace-normal">
          {linha.titulo}
        </span>
      </div>
    );
  };

  const columns: Column<LinhaRadar>[] = [
    {
      header: "CATEGORIA",
      accessorKey: "titulo",
      align: "left",
      className: "w-[34%]",
      renderCell: renderCategoria,
    },
    {
      header: "% DO PAGO",
      accessorKey: "percentualPago",
      align: "left",
      className: "hidden w-[26%] sm:table-cell",
      renderCell: (linha) => (
        <div className="flex items-center gap-3">
          <BarraProporcao
            percentual={linha.larguraBarra}
            className="bg-brand-fill"
          />
          <span className="text-ink min-w-10 text-right tabular-nums">
            {formatarPercentual(linha.percentualPago)}
          </span>
        </div>
      ),
    },
    {
      header: "VARIAÇÃO",
      accessorKey: "variacaoPercentual",
      align: "left",
      className: "hidden whitespace-nowrap sm:table-cell",
      renderCell: (linha) => (
        <VariacaoBadge linha={linha} anoAnterior={anoAnterior} />
      ),
    },
    {
      header: "PAGO NO ANO",
      accessorKey: "valorPago",
      align: "right",
      className: "whitespace-nowrap",
      renderCell: (linha) => (
        <span className="text-ink font-medium tabular-nums">
          {linha.valorPago > 0 ? fmtCompact(linha.valorPago) : "R$ 0"}
        </span>
      ),
    },
    {
      header: "AINDA A PAGAR (ACUM.)",
      accessorKey: "dividaReal",
      align: "right",
      className: "whitespace-nowrap",
      renderCell: (linha) => <ValorDivida valor={linha.dividaReal} />,
    },
  ];

  return (
    <div className={className}>
      <DenseTable
        data={linhasComBarra}
        columns={columns}
        rowKey="categoria"
        hideSearch
        enableExportCsv={false}
        recordLabel="categorias"
        renderExpandedRow={(linha) => (
          <DecomposicaoDivida
            linha={linha}
            baixarRegistros={
              portalSlug && (
                <ShowYourWorkButton
                  variante="link"
                  rotulo="Baixar registros (planilha CSV)"
                  legenda="Traz cada compra ou contrato desta categoria no ano, com fornecedor, objeto e os valores reservado, entregue e pago."
                  portalSlug={portalSlug}
                  ano={anoAtual}
                  tipo="gasto_sensivel"
                  categoria={linha.categoria}
                  entidades={entidades}
                  tituloContexto={linha.titulo}
                />
              )
            }
          />
        )}
        renderMobileRow={(linha) => ({
          resumo: (
            <div className="space-y-1.5">
              {renderCategoria(linha)}
              <div className="pl-11">
                <VariacaoBadge linha={linha} anoAnterior={anoAnterior} />
              </div>
              <div className="flex items-baseline justify-between gap-3 pl-11 text-xs">
                <span className="text-mute2">Pago no ano</span>
                <span className="text-ink font-medium tabular-nums">
                  {linha.valorPago > 0 ? fmtCompact(linha.valorPago) : "R$ 0"}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 pl-11 text-xs">
                <span className="text-mute2">Ainda a pagar (acum.)</span>
                <ValorDivida valor={linha.dividaReal} />
              </div>
            </div>
          ),
          detalhes: null,
        })}
      />
    </div>
  );
}
