"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

export type TemaEscolhido = "light" | "dark";

export interface ThemeToggleProps {
  /** Chave do localStorage onde a escolha é persistida. */
  storageKey?: string;
  className?: string;
}

const CHAVE_TEMA_PADRAO = "mt-tema";

const opcoes: {
  valor: TemaEscolhido;
  rotulo: string;
  Icone: typeof Sun;
}[] = [
  { valor: "light", rotulo: "Claro", Icone: Sun },
  { valor: "dark", rotulo: "Escuro", Icone: Moon },
];

export function ThemeToggle({
  storageKey = CHAVE_TEMA_PADRAO,
  className,
}: ThemeToggleProps) {
  const [tema, setTema] = useState<TemaEscolhido>("light");

  useEffect(() => {
    setTema(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  const escolher = (proximo: TemaEscolhido) => {
    document.documentElement.classList.toggle("dark", proximo === "dark");
    setTema(proximo);
    try {
      localStorage.setItem(storageKey, proximo);
    } catch {
      // localStorage indisponível: a troca vale apenas para esta sessão.
    }
  };

  return (
    <fieldset
      aria-label="Tema"
      className={cn(
        "m-0 flex w-full rounded-md border border-mute3 p-0.5",
        className,
      )}
    >
      {opcoes.map(({ valor, rotulo, Icone }) => {
        const ativo = tema === valor;
        return (
          <button
            key={valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => escolher(valor)}
            className={cn(
              "flex min-h-[32px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2 py-1 font-medium text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1",
              ativo ? "bg-ink text-onink" : "text-mute hover:text-ink",
            )}
          >
            <Icone strokeWidth={1.6} className="h-4 w-4 shrink-0" />
            {rotulo}
          </button>
        );
      })}
    </fieldset>
  );
}
