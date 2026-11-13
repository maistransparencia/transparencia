import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeloFonte } from "./selo-fonte";

const selo = {
  descricao: "sistema contábil da Prefeitura",
  dataVerificacao: "12/11/2026",
  aviso: null,
  href: "/portal_x/como-atualizamos",
};

describe("SeloFonte", () => {
  it("mostra fonte, data e link para a página", () => {
    render(<SeloFonte selo={selo} />);
    expect(screen.getByText(/verificado em 12\/11\/2026/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Como atualizamos" }),
    ).toHaveAttribute("href", "/portal_x/como-atualizamos");
    expect(screen.queryByText(/atualizado em/i)).not.toBeInTheDocument();
  });

  it("sem data omite o 'verificado em' e mostra o aviso", () => {
    render(
      <SeloFonte
        selo={{
          ...selo,
          dataVerificacao: null,
          aviso: "Não acompanhamos a data de atualização desta fonte.",
        }}
      />,
    );
    expect(screen.queryByText(/verificado em/)).not.toBeInTheDocument();
    expect(screen.getByText(/Não acompanhamos a data/)).toBeInTheDocument();
  });

  it("showWarning=false repete só o selo", () => {
    render(
      <SeloFonte selo={{ ...selo, aviso: "Aviso" }} showWarning={false} />,
    );
    expect(screen.queryByText("Aviso")).not.toBeInTheDocument();
  });

  it("sem selo não renderiza nada", () => {
    const { container } = render(<SeloFonte selo={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
