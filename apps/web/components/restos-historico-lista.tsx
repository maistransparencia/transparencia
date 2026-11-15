import { fmtCompact, fmtPercent } from "@transparencia/ui";

export interface RestosHistoricoLinhaProps {
  ano: number;
  restosInscritos: number;
  restosPagos: number;
  saldoRestos: number;
}

interface RestosHistoricoListaProps {
  linhas: RestosHistoricoLinhaProps[];
}

export function RestosHistoricoLista({ linhas }: RestosHistoricoListaProps) {
  return (
    <div className="space-y-3 md:hidden" data-testid="restos-historico-lista">
      <p className="caption flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-brand-fill block h-3 w-3" aria-hidden="true" />
          Pago no ano
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-warn-fill block h-3 w-3" aria-hidden="true" />
          Ainda a pagar
        </span>
      </p>
      <ul className="space-y-4">
        {linhas.map((linha) => {
          const percentualPago =
            linha.restosInscritos > 0
              ? Math.min(100, (linha.restosPagos / linha.restosInscritos) * 100)
              : 0;
          return (
            <li key={linha.ano} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink text-sm font-bold">{linha.ano}</span>
                <span className="numeric text-ink text-sm">
                  {fmtPercent(percentualPago, 0)} pago
                </span>
              </div>
              <div
                className="bg-track flex h-3 gap-px"
                role="img"
                aria-label={`${linha.ano}: ${fmtPercent(percentualPago, 0)} pago`}
              >
                <span
                  className="bg-brand-fill block h-full"
                  style={{ flexGrow: Math.max(0, linha.restosPagos) }}
                />
                <span
                  className="bg-warn-fill block h-full"
                  style={{ flexGrow: Math.max(0, linha.saldoRestos) }}
                />
              </div>
              <p className="caption">
                Pago {fmtCompact(linha.restosPagos)} de{" "}
                {fmtCompact(linha.restosInscritos)} levados · ainda a pagar{" "}
                {fmtCompact(linha.saldoRestos)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
