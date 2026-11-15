import { IndicadoresLinha } from "@transparencia/ui";

export interface FarmaciaIndicadorItem {
  codigo: string;
  rotulo: string;
  valor: string;
  nota: string | null;
  notaAtencao: boolean;
  detalhe?: { resumo: string; paragrafos: string[] } | null;
}

export function FarmaciaIndicadores({
  indicadores,
}: {
  indicadores: FarmaciaIndicadorItem[];
}) {
  if (indicadores.length === 0) return null;
  return (
    <div className="panel">
      <IndicadoresLinha indicadores={indicadores} />
    </div>
  );
}
