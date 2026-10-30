import { cn, fmtCompact, SectionHeader } from "@transparencia/ui";

export interface CarrosChefeArrecadacaoProps {
  fpm: number;
  icms: number;
  issIptu: number;
  totalArrecadado: number;
  className?: string;
}

export function CarrosChefeArrecadacao({
  fpm,
  icms,
  issIptu,
  totalArrecadado,
  className,
}: CarrosChefeArrecadacaoProps) {
  const items = [
    {
      label: "FPM · repasse do governo federal aos municípios",
      value: fpm,
      color: "bg-ok-fill",
    },
    {
      label:
        "ICMS · parte do imposto estadual sobre vendas, repassada pelo estado",
      value: icms,
      color: "bg-brand-fill",
    },
    {
      label:
        "ISS e IPTU · impostos cobrados pelo próprio município (serviços e imóveis)",
      value: issIptu,
      color: "bg-warn-fill",
    },
  ];

  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <section className={cn("space-y-4", className)}>
      <SectionHeader
        title="As 3 maiores fontes de dinheiro"
        description="De onde vem a maior parte do dinheiro, sem os códigos contábeis."
      />

      <div className="space-y-5">
        {items.map((item) => {
          const pctOfTotal =
            totalArrecadado > 0 ? (item.value / totalArrecadado) * 100 : 0;
          const barWidth = (item.value / maxVal) * 100;

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-ink">{item.label}</span>

                <div className="flex items-center gap-2">
                  <span className="font-semibold font-serif text-base text-ink">
                    {fmtCompact(item.value)}
                  </span>
                  <span className="caption font-medium">
                    ({pctOfTotal.toFixed(1).replace(".", ",")}% de tudo que
                    entrou)
                  </span>
                </div>
              </div>

              <div className="h-3 w-full overflow-hidden bg-track">
                <div
                  className={cn(
                    "h-full transition-all duration-500 ease-out",
                    item.color,
                  )}
                  style={{
                    width: `${Math.min(100, Math.max(0, barWidth))}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
