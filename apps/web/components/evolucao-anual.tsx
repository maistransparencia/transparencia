import { cn, fmtCompact } from "@transparencia/ui";

export interface EvolucaoAnualPonto {
  ano: number;
  empenhado: number;
  pago: number;
}

export interface EvolucaoAnualProps {
  data: EvolucaoAnualPonto[];
  selectedYear?: number;
  /** Ano ainda em andamento: os valores são acumulados até o período informado. */
  partialYear?: number;
  /** Frase mostrada quando não há execução registrada em nenhum ano. */
  mensagemVazia?: string;
  className?: string;
}

const percentualDaMaior = (valor: number, maior: number) =>
  maior > 0 ? Math.min(100, Math.max(0, (valor / maior) * 100)) : 0;

interface LinhaBarraProps {
  valor: number;
  maior: number;
  corClasse: string;
}

function LinhaBarra({ valor, maior, corClasse }: LinhaBarraProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 flex-1 bg-track">
        <div
          className={cn("h-full", corClasse)}
          style={{ width: `${percentualDaMaior(valor, maior)}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-medium text-ink text-sm tabular-nums">
        {fmtCompact(valor)}
      </span>
    </div>
  );
}

export function EvolucaoAnual({
  data,
  selectedYear,
  partialYear,
  mensagemVazia = "Sem execução registrada para comparar os anos.",
  className,
}: EvolucaoAnualProps) {
  if (data.length === 0) {
    return (
      <p className={cn("border-line border-y py-4 text-mute", className)}>
        {mensagemVazia}
      </p>
    );
  }

  const maior = Math.max(
    ...data.flatMap((linha) => [linha.empenhado, linha.pago]),
    0,
  );

  return (
    <div className={cn("space-y-6", className)}>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-hidden="true">
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 bg-brand-fill" />
          Reservado (empenhado)
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 bg-ok-fill" />
          Pago
        </li>
      </ul>

      <ul className="space-y-5">
        {data.map((linha) => (
          <li
            key={linha.ano}
            className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-[6rem_1fr]"
          >
            <span
              className={cn(
                "text-ink",
                linha.ano === selectedYear && "font-semibold",
              )}
            >
              {linha.ano}
              {linha.ano === partialYear ? (
                <span className="caption block font-normal">em andamento</span>
              ) : null}
            </span>
            <div className="space-y-1.5">
              <LinhaBarra
                valor={linha.empenhado}
                maior={maior}
                corClasse="bg-brand-fill"
              />
              <LinhaBarra
                valor={linha.pago}
                maior={maior}
                corClasse="bg-ok-fill"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
