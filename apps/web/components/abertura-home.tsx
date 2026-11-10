export interface AberturaHomeProps {
  title: string;
  periodLabel: string;
}

/** Abertura da home: situação da cidade e período dos dados, sem número fiscal. */
export function AberturaHome({ title, periodLabel }: AberturaHomeProps) {
  return (
    <header className="space-y-3">
      <p className="eyebrow">Situação da cidade</p>
      <h1>{title}</h1>
      <p className="lead">
        Como a cidade está hoje e para onde vai o dinheiro público.
      </p>
      <p className="caption">{periodLabel}</p>
    </header>
  );
}
