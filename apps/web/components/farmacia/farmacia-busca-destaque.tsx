"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export interface FarmaciaBuscaDestaqueProps {
  action: string;
  defaultValue?: string;
  exemplos: { nomePrincipioAtivo: string; href: string }[];
}

/** Busca protagonista: formulário GET (`?q=`) com botão de limpar e atalhos "Remédios comuns". */
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
        className="border-ink bg-page flex items-center gap-2.5 rounded-md border-2 p-2 pl-[18px]"
      >
        <Search
          className="text-mute2 h-[18px] w-[18px] shrink-0"
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
          className="text-ink placeholder:text-mute2 min-w-0 flex-1 bg-transparent py-3 text-[17px] outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {(termo.length > 0 || defaultValue.length > 0) && (
          <Link
            href={action}
            aria-label="Limpar busca"
            className="text-mute2 hover:bg-line2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg"
          >
            ×
          </Link>
        )}
        <button
          type="submit"
          className="bg-ink text-onink hover:bg-ink/80 focus-visible:ring-brand shrink-0 self-stretch rounded-md px-7 text-[15px] font-semibold focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          Buscar
        </button>
      </form>
      {exemplos.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-mute2 text-[13px]">Remédios comuns:</span>
          {exemplos.map((exemplo) => (
            <Link
              key={exemplo.nomePrincipioAtivo}
              href={exemplo.href}
              className="text-brand text-[14px] underline-offset-4 hover:underline"
            >
              {exemplo.nomePrincipioAtivo}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
