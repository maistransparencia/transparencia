import type { TipoAvisoMapa } from "@/hooks/use-mapa-gestos";

export interface MapaGestosAvisoProps {
  tipo: TipoAvisoMapa;
  isMac: boolean;
  testId: string;
}

export function MapaGestosAviso({ tipo, isMac, testId }: MapaGestosAvisoProps) {
  return (
    <div
      data-testid={testId}
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-1000 flex items-center justify-center bg-black/45 backdrop-blur-[2px] transition-opacity duration-200"
    >
      <div className="bg-ink/90 text-onink rounded-md px-4 py-2.5 text-center text-sm font-medium">
        {tipo === "desktop" ? (
          <>
            Use{" "}
            <span className="font-bold underline underline-offset-2">
              {isMac ? "⌘ (Command)" : "Ctrl"}
            </span>{" "}
            + scroll para aplicar zoom no mapa
          </>
        ) : (
          <>
            Use{" "}
            <span className="font-bold underline underline-offset-2">
              dois dedos
            </span>{" "}
            para mover o mapa
          </>
        )}
      </div>
    </div>
  );
}
