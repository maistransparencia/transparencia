import { AlertBox } from "@transparencia/ui";
import Link from "next/link";
import type { SeloFonteViewModel } from "@/lib/frescor-fontes";

export interface SeloFonteProps {
  selo: SeloFonteViewModel | null;
  /** O aviso aparece uma vez por página; as demais seções repetem só o selo. */
  showWarning?: boolean;
}

/** Selo de uma linha com a origem do dado e a data em que o portal o buscou. */
export function SeloFonte({ selo, showWarning = true }: SeloFonteProps) {
  if (!selo) return null;
  return (
    <div className="space-y-2" data-testid="selo-fonte">
      <p className="caption">
        <strong>Fonte:</strong> {selo.descricao}
        {selo.dataVerificacao && <> · verificado em {selo.dataVerificacao}</>} ·{" "}
        <Link
          href={selo.href}
          className="text-brand-text underline underline-offset-2"
        >
          Como atualizamos
        </Link>
      </p>
      {showWarning && selo.aviso && (
        <AlertBox type="info">{selo.aviso}</AlertBox>
      )}
    </div>
  );
}
