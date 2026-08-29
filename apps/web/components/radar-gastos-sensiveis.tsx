import type { CATEGORIAS_GASTOS_SENSIVEIS } from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Fuel,
  Hammer,
  PartyPopper,
  Plane,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";

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
  isCurrentYear?: boolean;
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

export function RadarGastosSensiveis({
  itens,
  anoAtual,
  anoAnterior,
  isCurrentYear = false,
  totalDespesasPagas = 0,
  className = "",
}: RadarGastosSensiveisProps) {
  if (!itens || itens.length === 0) return null;

  const renderIcon = (icone: RadarIcon) => {
    switch (icone) {
      case "fuel":
        return <Fuel className="h-5 w-5 text-amber-700" />;
      case "truck":
        return <Truck className="h-5 w-5 text-blue-700" />;
      case "building":
        return <Building2 className="h-5 w-5 text-indigo-700" />;
      case "party":
        return <PartyPopper className="h-5 w-5 text-purple-700" />;
      case "plane":
        return <Plane className="h-5 w-5 text-sky-700" />;
      case "hammer":
        return <Hammer className="h-5 w-5 text-emerald-700" />;
      default:
        return <Fuel className="h-5 w-5 text-amber-700" />;
    }
  };

  const getIconBg = (icone: RadarIcon) => {
    switch (icone) {
      case "fuel":
        return "bg-amber-50 border-amber-200/70";
      case "truck":
        return "bg-blue-50 border-blue-200/70";
      case "building":
        return "bg-indigo-50 border-indigo-200/70";
      case "party":
        return "bg-purple-50 border-purple-200/70";
      case "plane":
        return "bg-sky-50 border-sky-200/70";
      case "hammer":
        return "bg-emerald-50 border-emerald-200/70";
      default:
        return "bg-slate-50 border-slate-200/70";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((item) => {
          const config = CATEGORIA_CONFIG[item.categoria] ?? {
            titulo: item.categoria,
            descricao: "",
            icone: "fuel" as const,
          };

          const isAumento = item.tendencia === "aumento";
          const isEconomia = item.tendencia === "economia";
          const pesoOrcamento =
            totalDespesasPagas > 0
              ? ((item.valorPagoAnoAtual / totalDespesasPagas) * 100).toFixed(1)
              : "0.0";

          const dividaReal =
            item.dividaRealAcumulada ?? item.valorLiquidadoPendente ?? 0;
          const dividaRestos = item.dividaRestosAcumulada ?? 0;
          const dividaExercicio = item.valorLiquidadoPendente ?? 0;

          return (
            <div
              key={item.categoria}
              className="flex flex-col justify-between rounded-2xl border border-borderLine bg-white p-5 shadow-sm transition-all hover:border-ink/20"
            >
              {/* Header do Card: Ícone e Badge */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getIconBg(
                      config.icone,
                    )}`}
                  >
                    {renderIcon(config.icone)}
                  </div>

                  {/* Badge de Variação ou Peso no Orçamento */}
                  {isCurrentYear ? (
                    <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-medium text-slate-700 text-xs">
                      {pesoOrcamento}% do pago em {anoAtual}
                    </span>
                  ) : (
                    <>
                      {isAumento && item.variacaoPercentual !== null && (
                        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-700 text-xs">
                          <TrendingUp className="h-3.5 w-3.5" />+
                          {item.variacaoPercentual}% vs {anoAnterior}
                        </span>
                      )}

                      {isEconomia && item.variacaoPercentual !== null && (
                        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 text-xs">
                          <TrendingDown className="h-3.5 w-3.5" />
                          {item.variacaoPercentual}% vs {anoAnterior}
                        </span>
                      )}

                      {!isAumento && !isEconomia && (
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 text-xs">
                          {(() => {
                            if (item.variacaoPercentual === null) {
                              return "Sem histórico";
                            }
                            const sinal =
                              item.variacaoPercentual > 0 ? "+" : "";
                            return `${sinal}${item.variacaoPercentual}% vs ${anoAnterior}`;
                          })()}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-base text-ink">
                    {config.titulo}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-subtleText text-xs leading-relaxed">
                    {config.descricao}
                  </p>
                </div>
              </div>

              {/* Footer Estruturado: Valor Pago + Status de Dívida Real */}
              <div className="mt-4 border-borderLine border-t pt-3.5">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[11px] text-subtleText uppercase tracking-wider">
                    Total pago no ano
                  </span>
                  <div className="whitespace-nowrap font-bold font-serif text-2xl text-ink leading-tight">
                    {fmtCompact(item.valorPagoAnoAtual)}
                  </div>
                </div>

                {/* Pill de Status de Dívida Real Acumulada */}
                {(() => {
                  if (dividaReal > 0) {
                    return (
                      <div
                        className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs"
                        title={
                          dividaRestos > 0
                            ? `R$ ${dividaExercicio.toLocaleString("pt-BR")} do exercício ${anoAtual} + R$ ${dividaRestos.toLocaleString("pt-BR")} de anos anteriores (Restos a Pagar)`
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-1.5 font-medium text-amber-900">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                          <span>Dívida real acumulada:</span>
                        </div>
                        <span className="whitespace-nowrap font-bold font-serif text-amber-900">
                          {fmtCompact(dividaReal)}
                        </span>
                      </div>
                    );
                  }

                  if (
                    item.valorPagoAnoAtual === 0 &&
                    (item.valorEmpenhadoAnoAtual ?? 0) === 0
                  ) {
                    return (
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-slate-500">
                          <span>Sem despesas no ano</span>
                        </div>
                        <span className="whitespace-nowrap font-medium text-slate-500">
                          R$ 0,00
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>Serviços atestados:</span>
                      </div>
                      <span className="whitespace-nowrap font-semibold text-emerald-700">
                        100% quitados
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
