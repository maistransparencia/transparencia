import { PageEyebrow } from "./page-eyebrow";

export interface AberturaHomeProps {
  title: string;
  periodLabel: string;
}

/** Abertura da home: situação da cidade e período dos dados, sem número fiscal. */
export function AberturaHome({ title, periodLabel }: AberturaHomeProps) {
  return (
    <header className="space-y-2">
      <PageEyebrow>Situação da cidade</PageEyebrow>
      <h1>{title}</h1>
      <p className="text-mute2">
        Como a cidade está hoje e para onde vai o dinheiro público.{" "}
        <span className="text-sm">{periodLabel}</span>
      </p>
    </header>
  );
}
