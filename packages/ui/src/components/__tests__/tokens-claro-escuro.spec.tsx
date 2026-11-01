import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Badge } from "../badge";
import { ExternalLinkPill } from "../external-link-pill";
import { KPICard } from "../kpi-card";
import { SectionHeader } from "../section-header";
import { SegmentedButton } from "../segmented-button";

const CLASSES_PROIBIDAS = /(^|\s)(dark:|bg-white|text-slate-|border-slate-)/;

describe.each(["claro", "escuro"])(
  "componentes migrados no tema %s",
  (tema) => {
    afterEach(() => document.documentElement.classList.remove("dark"));

    it("renderiza só com classes de token, sem dark: nem paleta fixa", () => {
      if (tema === "escuro") document.documentElement.classList.add("dark");
      const { container } = render(
        <>
          <SectionHeader title="Secao" description="d" />
          <KPICard title="k" value="1" subtext="s" />
          <SegmentedButton active>Ano</SegmentedButton>
          <Badge variant="success">Ok</Badge>
          <ExternalLinkPill href="https://x.gov.br">Lei</ExternalLinkPill>
        </>,
      );
      expect(screen.getByText("Secao")).toBeInTheDocument();
      container.querySelectorAll("*").forEach((elemento) => {
        expect(elemento.getAttribute("class") ?? "").not.toMatch(
          CLASSES_PROIBIDAS,
        );
      });
    });
  },
);
