/**
 * Marca do MaisTransparencia (mesmo glifo do favicon). As cores vêm das
 * variáveis `--footer-logo-*`, o que dá a variante clara no rodapé escuro
 * (tema claro) e a variante azul no rodapé claro (tema escuro).
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="120" height="120" rx="30" fill="var(--footer-logo-tile)" />
      <g fill="var(--footer-logo-glyph)">
        <rect x="30" y="30" width="12" height="60" rx="4" />
        <rect x="30" y="42" width="30" height="12" rx="4" />
        <rect x="52" y="60" width="12" height="30" rx="4" />
        <rect x="74" y="48" width="12" height="42" rx="4" />
      </g>
    </svg>
  );
}
