import { cn } from "@transparencia/ui";

export interface VerDetalhesLinkProps {
  onClick: () => void;
  /** O que o detalhe abre; vai só para o leitor de tela ("Ver detalhes: Fundeb"). */
  context?: string;
  testId?: string;
  className?: string;
}

/**
 * "Ver detalhes" das seções de educação: link pequeno (14px), sempre em
 * linha própria. O alvo de toque vem da área invisível, não da altura do texto.
 */
export function VerDetalhesLink({
  onClick,
  context,
  testId,
  className,
}: VerDetalhesLinkProps) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={context ? `Ver detalhes: ${context}` : undefined}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "relative block w-fit cursor-pointer text-left font-medium text-brand-text text-sm underline underline-offset-2 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']",
        className,
      )}
    >
      Ver detalhes
    </button>
  );
}
