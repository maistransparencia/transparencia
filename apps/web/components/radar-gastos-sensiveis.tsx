import type {
  CATEGORIAS_GASTOS_SENSIVEIS,
  EntidadeDividaItemDTO,
} from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
import {
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

import { DecomposicaoDividaPopover } from "./decomposicao-divida-popover";
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

const ICONES = {
  fuel: Fuel,
  truck: Truck,
  building: Building2,
  party: PartyPopper,
  plane: Plane,
  hammer: Hammer,
} as const;

export function RadarGastosSensiveis({
  itens,
  anoAtual,
  anoAnterior,
  portalSlug,
  entidades,
  isCurrentYear = false,
  totalDespesasPagas = 0,
  className = "",
}: RadarGastosSensiveisProps) {
  if (!itens || itens.length === 0) return null;

  const renderIcon = (icone: RadarIcon) => {
    const Icone = ICONES[icone] ?? Fuel;
    return <Icone className="h-5 w-5 text-brand" aria-hidden="true" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 border-line border-t sm:grid-cols-2 lg:grid-cols-3">
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

          return (
            <div
              key={item.categoria}
              className="flex flex-col justify-between border-line border-b py-4 sm:px-4 lg:[&:not(:nth-child(3n+1))]:border-l sm:max-lg:[&:nth-child(2n)]:border-l sm:max-lg:[&:nth-child(2n+1)]:pl-0 lg:[&:nth-child(3n+1)]:pl-0"
            >
              {/* Header do Card: Ícone e Badge */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line">
                    {renderIcon(config.icone)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Badge de Variação ou Peso no Orçamento */}
                    {isCurrentYear ? (
                      <span className="inline-flex shrink-0 whitespace-nowrap rounded-md border border-line px-2.5 py-0.5 font-medium text-mute2 text-xs">
                        {pesoOrcamento}% do pago em {anoAtual}
                      </span>
                    ) : (
                      <>
                        {isAumento && item.variacaoPercentual !== null && (
                          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-danger px-2.5 py-0.5 font-semibold text-danger text-xs">
                            <TrendingUp className="h-3.5 w-3.5" />+
                            {item.variacaoPercentual}% vs {anoAnterior}
                          </span>
                        )}

                        {isEconomia && item.variacaoPercentual !== null && (
                          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-ok px-2.5 py-0.5 font-semibold text-ok text-xs">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {item.variacaoPercentual}% vs {anoAnterior}
                          </span>
                        )}

                        {!isAumento && !isEconomia && (
                          <span className="shrink-0 whitespace-nowrap rounded-md bg-pill px-2.5 py-0.5 font-medium text-mute2 text-xs">
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

                    {/* Botão sutil de 3 pontos para Show Your Work */}
                    {portalSlug && (
                      <ShowYourWorkButton
                        portalSlug={portalSlug}
                        ano={anoAtual}
                        tipo="gasto_sensivel"
                        categoria={item.categoria}
                        entidades={entidades}
                        tituloContexto={config.titulo}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-base text-ink">
                    {config.titulo}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-mute2 text-xs leading-relaxed">
                    {config.descricao}
                  </p>
                </div>
              </div>

              {/* Footer Estruturado: Valor Pago + Status de Dívida Real */}
              <div className="mt-4 border-line border-t pt-3.5">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[11px] text-mute2 uppercase tracking-wider">
                    Total pago no ano
                  </span>
                  <div className="whitespace-nowrap font-bold font-serif text-2xl text-ink leading-tight">
                    {fmtCompact(item.valorPagoAnoAtual)}
                  </div>
                </div>

                {/* Pill / Gatilho de Status de Dívida Real Acumulada */}
                {(() => {
                  if (dividaReal > 0) {
                    return (
                      <DecomposicaoDividaPopover
                        categoriaTitulo={config.titulo}
                        dividaRealTotal={dividaReal}
                        decomposicao={item.decomposicaoDivida ?? []}
                      />
                    );
                  }

                  if (
                    item.valorPagoAnoAtual === 0 &&
                    (item.valorEmpenhadoAnoAtual ?? 0) === 0
                  ) {
                    return (
                      <div className="mt-3 flex items-center justify-between border-line border-t pt-2 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-mute2">
                          <span>Sem despesas no ano</span>
                        </div>
                        <span className="whitespace-nowrap font-medium text-mute2">
                          R$ 0,00
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 flex items-center justify-between border-line border-t pt-2 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-mute2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok" />
                        <span>Serviços atestados:</span>
                      </div>
                      <span className="whitespace-nowrap font-semibold text-ok">
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
