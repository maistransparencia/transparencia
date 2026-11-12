"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

// `error.tsx` não captura erros lançados no root layout (layout.tsx), que também
// consulta o banco (getPortalConfig / getEntidades). O `global-error` é o único
// boundary que cobre esse caso e, por substituir o layout inteiro, precisa
// renderizar suas próprias tags <html> e <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-page text-ink flex min-h-screen items-center justify-center font-sans antialiased">
        <div className="flex max-w-[600px] flex-col items-start gap-4 px-6">
          <h1>Portal temporariamente indisponível</h1>
          <p className="text-mute">
            Não conseguimos carregar as informações agora. Tente novamente em
            instantes.
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
      </body>
    </html>
  );
}
