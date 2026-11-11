"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

// Fallback exibido quando o render de uma página falha no servidor. Antes disso,
// qualquer falha (ex.: conexão com o Postgres) chegava ao visitante como o erro
// genérico do Next.js, sem UI de recuperação.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Redundância com o `onRequestError` server-side: garante o registro caso o
    // erro seja lançado no cliente.
    posthog.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[600px] flex-col items-start gap-4 py-16">
      <h1>Não foi possível carregar esta página</h1>
      <p className="text-mute">
        Tivemos um problema ao consultar os dados fiscais deste portal. Isso
        costuma ser temporário — tente novamente em instantes.
      </p>
      {error.digest && (
        <p className="text-mute2 text-xs">
          Código de referência: <span>{error.digest}</span>
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="bg-ink text-onink rounded px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
      >
        Tentar novamente
      </button>
    </div>
  );
}
