export interface AberturaHomeProps {
  title: string;
  lead: string;
  periodLabel: string;
}

/** Abertura da home: situação da cidade e período dos dados, sem número fiscal. */
export function AberturaHome({ title, lead, periodLabel }: AberturaHomeProps) {
  return (
    <header className="space-y-2">
      <h1>{title}</h1>
      <p className="text-mute2">
        {lead} <span className="text-sm">{periodLabel}</span>
      </p>
    </header>
  );
}
