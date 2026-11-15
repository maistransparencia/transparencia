import { render, screen } from "@testing-library/react";
import { Info } from "lucide-react";
import { describe, expect, it } from "vitest";
import { DestaqueLinha } from "./destaque-linha";

describe("DestaqueLinha", () => {
  it.each(["positivo", "atencao", "alerta", "neutro"] as const)(
    "expõe data-tom %s e estilo do badge por token",
    (tom) => {
      render(
        <DestaqueLinha
          ariaLabel="Linha"
          icone={Info}
          titulo="Título"
          badgeTexto="Badge"
          tom={tom}
          contexto="Contexto"
        />,
      );
      expect(screen.getByTestId("destaque-linha")).toHaveAttribute(
        "data-tom",
        tom,
      );
      expect(screen.getByTestId("destaque-badge").className).not.toMatch(
        /emerald|amber|rose|slate/,
      );
    },
  );
});
