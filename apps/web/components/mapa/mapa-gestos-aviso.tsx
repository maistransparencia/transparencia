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
      <div className="rounded-xl border border-white/20 bg-slate-900/90 px-4 py-2.5 text-center font-medium text-sm text-white shadow-xl">
        {tipo === "desktop" ? (
          <>
            Use{" "}
            <span className="font-semibold text-amber-400">
              {isMac ? "⌘ (Command)" : "Ctrl"}
            </span>{" "}
            + scroll para aplicar zoom no mapa
          </>
        ) : (
          <>
            Use <span className="font-semibold text-amber-400">dois dedos</span>{" "}
            para mover o mapa
          </>
        )}
      </div>
    </div>
  );
}
