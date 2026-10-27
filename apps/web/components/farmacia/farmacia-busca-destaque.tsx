"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export interface FarmaciaBuscaDestaqueProps {
  action: string;
  defaultValue?: string;
  exemplos: { nomePrincipioAtivo: string; href: string }[];
}

/** Busca protagonista: formulário GET (`?q=`) com botão de limpar e atalhos "Mais procurados". */
export function FarmaciaBuscaDestaque({
  action,
  defaultValue = "",
  exemplos,
}: FarmaciaBuscaDestaqueProps) {
  const [termo, setTermo] = useState(defaultValue);

  return (
    <div className="space-y-3">
      <form
        method="get"
        action={`${action}#resultados`}
        aria-label="Busca de remédios"
        className="flex items-center gap-2.5 overflow-hidden rounded-md border-[1.5px] border-ink bg-page pl-[18px]"
      >
        <Search
          className="h-[18px] w-[18px] shrink-0 text-mute2"
          aria-hidden="true"
        />
        <label htmlFor="farmacia-busca" className="sr-only">
          Qual remédio você procura?
        </label>
        <input
          id="farmacia-busca"
          name="q"
          type="search"
          minLength={2}
          required
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Nome do remédio, ex.: losartana"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-3 text-[17px] text-ink outline-none placeholder:text-mute2 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {(termo.length > 0 || defaultValue.length > 0) && (
          <Link
            href={action}
            aria-label="Limpar busca"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg text-mute2 hover:bg-line2"
          >
            ×
          </Link>
        )}
        <button
          type="submit"
          className="-my-px -mr-px shrink-0 self-stretch bg-ink px-7 font-semibold text-[15px] text-onink hover:bg-ink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
        >
          Buscar
        </button>
      </form>
      {exemplos.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[13px] text-mute2">Mais procurados:</span>
          {exemplos.map((exemplo) => (
            <Link
              key={exemplo.nomePrincipioAtivo}
              href={exemplo.href}
              className="text-[14px] text-brand underline-offset-4 hover:underline"
            >
              {exemplo.nomePrincipioAtivo}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
