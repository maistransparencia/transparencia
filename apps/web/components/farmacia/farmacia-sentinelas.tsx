import { fmtNumber } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { urlLegislacao } from "@/lib/constants/legislacao";

export interface FarmaciaSentinelaItem {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  unidadesComRegistro: number;
  unidadesSomenteCombinacao: number;
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
          Remédios que o Ministério da Saúde considera essenciais, segundo a
          lista nacional (
          <a
            href={urlLegislacao("rename2024")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            RENAME, edição 2024
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          ). Os dados oficiais só listam remédios que têm estoque. Se um remédio
          aparece como “não aparece na lista de estoque”, ele não consta na
          última lista divulgada. Isso não prova que acabou: a prefeitura também
          pode não ter escolhido distribuir esse remédio. Remédios misturados em
          um só comprimido (ex.: valsartana + hidroclorotiazida) não contam como
          o remédio sozinho.
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
                        : item.unidadesSomenteCombinacao > 0
                          ? `só aparece misturado com outro remédio em ${fmtNumber(item.unidadesSomenteCombinacao)} de ${fmtNumber(totalUnidadesAtivas)} unidades`
                          : "não aparece na lista de estoque"}
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
