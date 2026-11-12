import type React from "react";
import { cn } from "../utils/cn";

export interface TooltipProps {
  /** O conteúdo a ser exibido dentro do balão do tooltip (texto ou elemento React) */
  content: React.ReactNode;
  /** Elemento gatilho do tooltip. Se omitido, renderiza o indicador discreto (i) */
  children?: React.ReactNode;
  /** Posicionamento do tooltip em relação ao elemento disparador */
  position?: "top" | "bottom" | "left" | "right";
  /** Rótulo de acessibilidade (aria-label) para o gatilho */
  ariaLabel?: string;
  /** Classes CSS adicionais para o container do gatilho */
  className?: string;
  /** Classes CSS adicionais para o balão do tooltip */
  contentClassName?: string;
  /** Estilos inline para o container do gatilho */
  style?: React.CSSProperties;
}

export function Tooltip({
  content,
  children,
  position = "bottom",
  ariaLabel,
  className,
  contentClassName,
  style,
}: TooltipProps) {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={cn("group relative inline-flex items-center", className)}
      style={style}
    >
      {children ? (
        children
      ) : (
        <span
          role="img"
          className="bg-line2 text-mute2 hover:bg-track hover:text-ink flex h-4 w-4 cursor-help items-center justify-center rounded-full text-[10px] font-bold transition-colors"
          aria-label={ariaLabel || "Mais informações"}
        >
          i
        </span>
      )}
      <div
        role="tooltip"
        className={cn(
          "border-ink bg-ink text-onink pointer-events-none absolute z-30 hidden w-64 rounded-lg border p-3 font-sans shadow-xl transition-all group-focus-within:block group-hover:block",
          positionClasses[position],
          contentClassName,
        )}
      >
        {content}
      </div>
    </div>
  );
}

export interface TruncatedTextProps {
  /** Texto completo a ser truncado e exibido no tooltip */
  text: string;
  /** Limite máximo de caracteres antes de truncar (default: 35) */
  maxLength?: number;
  /** Classes CSS adicionais para o container do texto */
  className?: string;
  /** Posição do tooltip (default: top) */
  position?: "top" | "bottom" | "left" | "right";
}
