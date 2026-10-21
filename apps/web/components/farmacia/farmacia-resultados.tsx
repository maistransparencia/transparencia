import { fmtDate, fmtNumber } from "@transparencia/ui";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { StaticTileMap } from "@/components/static-tile-map";

export interface FarmaciaResultadoUnidade {
  idUnidade: string;
  nomeUnidade: string;
  enderecoUnidade: string | null;
  telefoneUnidade: string | null;
  href: string;
  medicamentos: {
    nomeMedicamento: string;
    quantidadeEstoque: number;
    dataPosicaoEstoque: string | null;
  }[];
}

export interface FarmaciaResultadosProps {
  busca: string;
  unidades: FarmaciaResultadoUnidade[];
  mapMarkers: { id: string; latitude: number; longitude: number }[];
  hasMaisUnidades: boolean;
  maisUnidadesHref: string;
  unidadeFiltrada: boolean;
  limparFiltroUnidadeHref: string;
}

export function FarmaciaResultados({
  busca,
  unidades,
  mapMarkers,
  hasMaisUnidades,
  maisUnidadesHref,
  unidadeFiltrada,
  limparFiltroUnidadeHref,
}: FarmaciaResultadosProps) {
  if (unidades.length === 0) {
    return (
      <div className="rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-6 text-center">
        <p className="font-medium text-ink text-sm">
          Nenhuma unidade com estoque de “{busca}” na última posição divulgada.
        </p>
        {unidadeFiltrada && (
          <Link
            href={limparFiltroUnidadeHref}
            className="mt-2 inline-flex min-h-11 items-center font-semibold text-accent text-xs hover:underline"
          >
            Limpar filtros
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unidadeFiltrada && (
        <Link
          href={limparFiltroUnidadeHref}
          className="inline-flex min-h-11 items-center font-semibold text-accent text-xs hover:underline"
        >
          Limpar filtros
        </Link>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-3">
          {unidades.map((unidade) => (
            <li
              key={unidade.idUnidade}
              className="rounded-xl border border-[#e7e9ee] bg-white p-4 shadow-sm"
            >
              <h3 className="font-bold font-serif text-base text-ink">
                {unidade.nomeUnidade}
              </h3>
              <div className="mt-1 space-y-0.5 text-subtleText text-xs">
                {unidade.enderecoUnidade && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {unidade.enderecoUnidade}
                  </p>
                )}
                {unidade.telefoneUnidade && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {unidade.telefoneUnidade}
                  </p>
                )}
              </div>
              <ul className="mt-3 divide-y divide-[#e7e9ee] text-sm">
                {unidade.medicamentos.map((medicamento, indice) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: lista estática; nome+data podem repetir na mesma unidade
                    key={`${medicamento.nomeMedicamento}-${medicamento.dataPosicaoEstoque}-${indice}`}
                    className="flex items-baseline justify-between gap-3 py-1.5"
                  >
                    <span className="text-ink">
                      {medicamento.nomeMedicamento}
                    </span>
                    <span className="shrink-0 text-right text-subtleText text-xs">
                      <strong className="text-ink">
                        {fmtNumber(medicamento.quantidadeEstoque)}
                      </strong>{" "}
                      un.
                      {medicamento.dataPosicaoEstoque
                        ? ` · ${fmtDate(medicamento.dataPosicaoEstoque)}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
              {!unidadeFiltrada && (
                <Link
                  href={unidade.href}
                  className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-accent text-xs hover:underline"
                >
                  <span>Filtrar por esta unidade</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </ul>
        {mapMarkers.length > 0 && (
          <StaticTileMap
            markers={mapMarkers}
            alt="Mapa das unidades com o medicamento em estoque"
            className="h-56 w-full lg:sticky lg:top-4 lg:h-72"
          />
        )}
      </div>
      {hasMaisUnidades && (
        <Link
          href={maisUnidadesHref}
          className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-[#e7e9ee] bg-white px-4 font-semibold text-accent text-sm hover:bg-slate-50"
        >
          Ver mais unidades
        </Link>
      )}
    </div>
  );
}
