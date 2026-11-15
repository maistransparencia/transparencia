import type { ReactNode } from "react";

export interface PageEyebrowProps {
  children: ReactNode;
}

/**
 * Rótulo acima do `h1` da página. Um só estilo em todas as páginas que o têm:
 * papel `eyebrow` em `brand-text`; o texto vem em caixa normal e o papel põe em caixa alta.
 */
export function PageEyebrow({ children }: PageEyebrowProps) {
  return <p className="eyebrow text-brand-text!">{children}</p>;
}
