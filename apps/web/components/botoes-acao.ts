const base =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 font-medium text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/** Ação principal (ex.: receber alertas, ativar notificações). */
export const botaoPrimario = `${base} bg-ink text-onink hover:opacity-90`;

/** Ação secundária (ex.: instalar aplicativo, desativar notificações). */
export const botaoSecundario = `${base} border border-line bg-page text-ink hover:border-ink`;
