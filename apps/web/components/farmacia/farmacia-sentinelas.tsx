import { fmtNumber } from "@transparencia/ui";
import Link from "next/link";

export interface FarmaciaSentinelaItem {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  unidadesComRegistro: number;
  href: string;
}

export interface FarmaciaSentinelaGrupo {
  codigo: string;
  rotulo: string;
  itens: FarmaciaSentinelaItem[];
}

export interface FarmaciaSentinelasProps {
  grupos: FarmaciaSentinelaGrupo[];
  totalUnidadesAtivas: number;
}

export function FarmaciaSentinelas({
  grupos,
  totalUnidadesAtivas,
}: FarmaciaSentinelasProps) {
  if (grupos.length === 0 || totalUnidadesAtivas === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="farmacia-sentinelas-titulo">
      <div className="space-y-1">
        <h2
          id="farmacia-sentinelas-titulo"
          className="font-bold font-serif text-ink text-xl"
        >
          Remédios essenciais
        </h2>
        <p className="text-subtleText text-xs">
          Lista baseada na RENAME 2024 (Relação Nacional de Medicamentos
          Essenciais). A fonte oficial publica apenas itens com saldo, por isso
          “sem registro de estoque informado” indica que o remédio não aparece
          na posição divulgada, não que o estoque tenha acabado. O município
          pode também não ter o item padronizado.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {grupos.map((grupo) => (
          <div
            key={grupo.codigo}
            className="rounded-xl border border-[#e7e9ee] bg-white p-4"
          >
            <h3 className="font-semibold text-ink text-sm">{grupo.rotulo}</h3>
            <ul className="mt-2 divide-y divide-[#e7e9ee] text-sm">
              {grupo.itens.map((item) => (
                <li key={item.codigoPrincipioAtivo}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 items-center justify-between gap-3 py-2 hover:underline"
                  >
                    <span className="font-medium text-ink">
                      {item.nomePrincipioAtivo}
                    </span>
                    <span className="text-right text-subtleText text-xs">
                      {item.unidadesComRegistro > 0
                        ? `${fmtNumber(item.unidadesComRegistro)} de ${fmtNumber(totalUnidadesAtivas)} unidades que informaram estoque`
                        : "sem registro de estoque informado"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
