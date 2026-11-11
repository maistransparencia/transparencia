import { fmtCompact, fmtCurrency, SectionHeader } from "@transparencia/ui";

interface DecimoTerceiroCardProps {
  empenhado: number;
  pago: number;
  pctPago: number;
}

export function DecimoTerceiroCard({
  empenhado,
  pago,
  pctPago,
}: DecimoTerceiroCardProps) {
  const pctInt = Math.max(0, Math.min(100, Math.round(pctPago * 100)));

  return (
    <section className="space-y-4">
      <SectionHeader title="13º salário" />

      <dl className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <dt className="eyebrow mb-1">Total reservado (ajustado)</dt>
          <dd className="stat-value" title={fmtCurrency(empenhado)}>
            {fmtCompact(empenhado)}
          </dd>
        </div>

        <div>
          <dt className="eyebrow mb-1">Efetivamente pago</dt>
          <dd className="stat-value" title={fmtCurrency(pago)}>
            {fmtCompact(pago)}
          </dd>
        </div>

        <div>
          <dt className="eyebrow mb-1">Percentual quitado</dt>
          <dd className="stat-value text-ok-text">{pctInt}%</dd>
        </div>
      </dl>

      <div className="h-3 w-full overflow-hidden bg-track">
        <div
          className="h-full bg-ok-fill transition-all duration-500"
          style={{ width: `${pctInt}%` }}
        />
      </div>
    </section>
  );
}
