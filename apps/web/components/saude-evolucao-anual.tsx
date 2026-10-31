import { cn, fmtCompact } from "@transparencia/ui";

export interface EvolucaoAnualSaude {
  ano: number;
  empenhado: number;
  pago: number;
}

export interface SaudeEvolucaoAnualProps {
  data: EvolucaoAnualSaude[];
  selectedYear?: number;
  /** Ano ainda em andamento: os valores são acumulados até o período informado. */
  partialYear?: number;
  partialPeriod?: string;
  className?: string;
}

const percentualDaMaior = (valor: number, maior: number) =>
  maior > 0 ? Math.min(100, Math.max(0, (valor / maior) * 100)) : 0;

export function SaudeEvolucaoAnual({
  data,
  selectedYear,
  partialYear,
  partialPeriod,
  className,
}: SaudeEvolucaoAnualProps) {
  if (data.length === 0) {
    return (
      <p className={cn("border-line border-y py-4 text-mute", className)}>
        Sem execução da saúde registrada para comparar os anos.
      </p>
    );
  }

  const maior = Math.max(...data.map((linha) => linha.empenhado), 0);

  return (
    <div className={cn("space-y-6", className)}>
      <p className="lead">
        Quanto o Fundo reservou (empenhado) e quanto já pagou em cada ano.
        Reservar não é pagar: a diferença é o que ainda não saiu do caixa.
        {partialYear !== undefined ? (
          <>
            {" "}
            O ano de {partialYear} está em andamento
            {partialPeriod ? ` (${partialPeriod})` : ""} e não deve ser
            comparado com anos completos.
          </>
        ) : null}
      </p>

      <ul className="space-y-5">
        {data.map((linha) => (
          <li
            key={linha.ano}
            className={cn(
              "grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-2 sm:grid-cols-[6rem_1fr_9rem]",
              linha.ano === selectedYear && "font-semibold",
            )}
          >
            <span className="text-ink">
              {linha.ano}
              {linha.ano === partialYear ? (
                <span className="caption block font-normal">em andamento</span>
              ) : null}
            </span>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-track">
                <div
                  className="h-full bg-brand-fill"
                  style={{
                    width: `${percentualDaMaior(linha.empenhado, maior)}%`,
                  }}
                />
              </div>
              <div className="h-3 w-full bg-track">
                <div
                  className="h-full bg-ok-fill"
                  style={{
                    width: `${percentualDaMaior(linha.pago, maior)}%`,
                  }}
                />
              </div>
            </div>
            <dl className="col-span-2 flex gap-6 text-sm sm:col-span-1 sm:block sm:space-y-1.5 sm:text-right">
              <div className="flex items-baseline justify-between gap-2 sm:justify-end">
                <dt className="caption">Reservado</dt>
                <dd className="numeric text-ink">
                  {fmtCompact(linha.empenhado)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 sm:justify-end">
                <dt className="caption">Pago</dt>
                <dd className="numeric text-ink">{fmtCompact(linha.pago)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
