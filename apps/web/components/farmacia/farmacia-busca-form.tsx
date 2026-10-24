import { Search, X } from "lucide-react";
import Link from "next/link";

export interface FarmaciaBuscaFormProps {
  action: string;
  defaultValue?: string;
  rotuloBotaoMobile?: string;
  className?: string;
  /** Quando informado, exibe o link para voltar à página sem busca. */
  limparHref?: string;
}

/** Formulário GET: o termo vira `?q=` e a rota resolve a busca no servidor. */
export function FarmaciaBuscaForm({
  action,
  defaultValue = "",
  rotuloBotaoMobile,
  className = "",
  limparHref,
}: FarmaciaBuscaFormProps) {
  return (
    <form
      method="get"
      action={action}
      aria-label="Busca de medicamentos"
      className={`flex flex-col gap-2 sm:flex-row ${className}`}
    >
      <label htmlFor="farmacia-busca" className="sr-only">
        Qual remédio você procura?
      </label>
      <input
        id="farmacia-busca"
        name="q"
        type="search"
        minLength={2}
        required
        defaultValue={defaultValue}
        placeholder="Qual remédio você procura?"
        autoComplete="off"
        className="min-h-13 flex-1 rounded-xl border border-[#e7e9ee] bg-white px-4 text-base text-ink placeholder:text-subtleText focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 sm:min-h-12 sm:text-sm"
      />
      <button
        type="submit"
        aria-label="Buscar remédio no estoque"
        className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-sm text-white transition-colors hover:bg-accent/90 sm:min-h-12"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        {rotuloBotaoMobile ? (
          <>
            <span className="sm:hidden">{rotuloBotaoMobile}</span>
            <span className="hidden sm:inline">Buscar</span>
          </>
        ) : (
          <span>Buscar</span>
        )}
      </button>
      {limparHref && (
        <Link
          href={limparHref}
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-[#e7e9ee] bg-white px-5 font-semibold text-ink text-sm transition-colors hover:bg-slate-50 sm:min-h-12"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Limpar busca
        </Link>
      )}
    </form>
  );
}
