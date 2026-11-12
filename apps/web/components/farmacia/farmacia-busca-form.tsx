import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

export interface FarmaciaBuscaFormProps {
  action: string;
  defaultValue?: string;
  className?: string;
  /** Quando informado, exibe o link para voltar à página sem busca. */
  limparHref?: string;
}

/** Formulário GET: o termo vira `?q=` e a rota resolve a busca no servidor. */
export function FarmaciaBuscaForm({
  action,
  defaultValue = "",
  className = "",
  limparHref,
}: FarmaciaBuscaFormProps) {
  // No celular o botão é só a lupa, para caber na mesma linha do campo;
  // "Limpar busca" quebra para a linha de baixo.
  return (
    <Form
      action={action}
      aria-label="Busca de remédios"
      className={`border-ink bg-page focus-within:ring-brand/30 flex flex-wrap items-center gap-2 rounded-md border-2 p-2 focus-within:ring-2 sm:flex-nowrap sm:gap-2.5 sm:pl-[18px] ${className}`}
    >
      <Search
        className="text-mute2 hidden h-[18px] w-[18px] shrink-0 sm:block"
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
        defaultValue={defaultValue}
        placeholder="Qual remédio você procura?"
        autoComplete="off"
        className="text-ink placeholder:text-mute3 min-h-13 min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 text-base focus:outline-none sm:min-h-10 sm:px-0 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
      <button
        type="submit"
        className="bg-ink text-onink hover:bg-ink/90 inline-flex min-h-13 min-w-13 shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors sm:min-h-10 sm:px-5"
      >
        <Search className="h-5 w-5 sm:hidden" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Buscar</span>
      </button>
      {limparHref && (
        <Link
          href={limparHref}
          className="bg-page text-ink hover:bg-line2/40 inline-flex min-h-13 basis-full items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors sm:min-h-10 sm:basis-auto"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Limpar busca
        </Link>
      )}
    </Form>
  );
}
