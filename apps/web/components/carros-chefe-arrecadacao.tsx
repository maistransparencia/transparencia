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
      nome: "FPM",
      descricao: "Repasse do governo federal aos municípios",
      value: fpm,
      color: "bg-ok-fill",
    },
    {
      nome: "ICMS",
      descricao:
        "Parte do imposto estadual sobre vendas, repassada pelo estado",
      value: icms,
      color: "bg-brand-fill",
    },
    {
      nome: "ISS e IPTU",
      descricao:
        "Impostos cobrados pelo próprio município (serviços e imóveis)",
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
            <div key={item.nome} className="space-y-1.5">
              <div>
                <p className="text-ink text-sm font-semibold">{item.nome}</p>
                <p className="caption">{item.descricao}</p>
              </div>

              <div className="bg-track h-3 w-full overflow-hidden">
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

              <p className="caption">
                <span className="numeric text-ink font-semibold">
                  {fmtCompact(item.value)}
                </span>{" "}
                · {pctOfTotal.toFixed(1).replace(".", ",")}% de tudo que entrou
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
