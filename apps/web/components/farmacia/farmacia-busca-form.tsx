import { Search } from "lucide-react";

export interface FarmaciaBuscaFormProps {
  action: string;
  defaultValue?: string;
  className?: string;
}

/** Formulário GET: o termo vira `?q=` e a rota resolve a busca no servidor. */
export function FarmaciaBuscaForm({
  action,
  defaultValue = "",
  className = "",
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
        className="min-h-11 flex-1 rounded-xl border border-[#e7e9ee] bg-white px-4 text-ink text-sm placeholder:text-subtleText focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <button
        type="submit"
        aria-label="Buscar remédio no estoque"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-sm text-white transition-colors hover:bg-accent/90"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>Buscar</span>
      </button>
    </form>
  );
}
