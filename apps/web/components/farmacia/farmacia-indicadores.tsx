import { IndicadoresLinha } from "@transparencia/ui";

export interface FarmaciaIndicadorItem {
  codigo: string;
  rotulo: string;
  valor: string;
  nota: string | null;
  notaAtencao: boolean;
}

export function FarmaciaIndicadores({
  indicadores,
}: {
  indicadores: FarmaciaIndicadorItem[];
}) {
  return <IndicadoresLinha indicadores={indicadores} />;
}
