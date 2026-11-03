"use client";

import type {
  EducacaoCategoriaContrato,
  EducacaoContratoDTO,
} from "@transparencia/db";
import { Badge, cn, SectionHeader } from "@transparencia/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EducacaoContratosCategoriaTotais } from "@/app/[portalSlug]/educacao/view-model";
import { ContratoDetalhesModal } from "@/components/contrato-detalhes-modal";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { CategoriaContratoCard } from "./categoria-contrato-card";
import { ContratosCategoriaModal } from "./contratos-categoria-modal";
import { ContratosTabela } from "./contratos-tabela";
import {
  educacaoDtoToContratoServicoVigente,
  formatCategoriaLabel,
} from "./educacao-contratos-utils";
import { type LeiLinkProps, LinhaLeiEFonte } from "./educacao-textos";

export interface EducacaoContratosSectionProps {
  contratos: EducacaoContratoDTO[];
  totaisPorCategoria: Record<
    EducacaoCategoriaContrato,
    EducacaoContratosCategoriaTotais
  >;
  initialContratoNumero?: string;
  portalSlug: string;
  ano?: number;
}

const CATEGORIAS_ORDENADAS: EducacaoCategoriaContrato[] = [
  "merenda_pnae",
  "transporte_pnate",
  "manutencao_geral",
  "locacao_imoveis",
  "outros",
];

const LEI_MERENDA: LeiLinkProps = {
  label: "Lei 11.947/2009 (merenda)",
  url: urlLegislacao("lei11947"),
  ariaLabel: "Texto oficial da Lei nº 11.947/2009 (PNAE) no Planalto",
};
const LEI_TRANSPORTE: LeiLinkProps = {
  label: "Lei 10.880/2004 (transporte)",
  url: urlLegislacao("lei10880"),
  ariaLabel: "Texto oficial da Lei nº 10.880/2004 (PNATE) no Planalto",
};
const LEI_LOCACAO: LeiLinkProps = {
  label: "Lei 14.133/2021, art. 74, V (locação)",
  url: urlLegislacao("lei14133", "art74v"),
  ariaLabel:
    "Texto oficial da Lei nº 14.133/2021, Art. 74, V (Locação de Imóveis) no Planalto",
};

const LEIS_DA_CATEGORIA: Partial<
  Record<EducacaoCategoriaContrato, LeiLinkProps[]>
> = {
  merenda_pnae: [LEI_MERENDA],
  transporte_pnate: [LEI_TRANSPORTE],
  locacao_imoveis: [LEI_LOCACAO],
};

export function EducacaoContratosSection({
  contratos,
  totaisPorCategoria,
  initialContratoNumero,
  portalSlug,
  ano,
}: EducacaoContratosSectionProps) {
  const [categoriaAberta, setCategoriaAberta] =
    useState<EducacaoCategoriaContrato | null>(null);
  const [selectedContratoDto, setSelectedContratoDto] =
    useState<EducacaoContratoDTO | null>(null);

  // Sincronização com URL (?contratoNumero=...) incluindo popstate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const termo = (urlParams.get("contratoNumero") || "").trim();

      if (!termo) {
        setSelectedContratoDto(null);
        return;
      }

      const match = contratos.find((c) => {
        const numClean = c.contratoNumero.replace(/^0+/, "").toLowerCase();
        const termoClean = termo.replace(/^0+/, "").toLowerCase();
        return (
          c.contratoNumero.toLowerCase() === termo.toLowerCase() ||
          numClean === termoClean ||
          c.contratoId === termo
        );
      });

      setSelectedContratoDto(match ?? null);
    };

    if (initialContratoNumero) {
      const match = contratos.find((c) => {
        const numClean = c.contratoNumero.replace(/^0+/, "").toLowerCase();
        const termoClean = initialContratoNumero
          .replace(/^0+/, "")
          .toLowerCase();
        return (
          c.contratoNumero.toLowerCase() ===
            initialContratoNumero.toLowerCase() ||
          numClean === termoClean ||
          c.contratoId === initialContratoNumero
        );
      });
      if (match) setSelectedContratoDto(match);
    } else {
      syncFromUrl();
    }

    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, [contratos, initialContratoNumero]);

  const handleOpenContrato = useCallback((c: EducacaoContratoDTO) => {
    setSelectedContratoDto(c);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("contratoNumero", c.contratoNumero);
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedContratoDto(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("contratoNumero");
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  const contratosDaCategoria = useMemo(
    () =>
      categoriaAberta
        ? contratos.filter((c) => c.categoria === categoriaAberta)
        : [],
    [contratos, categoriaAberta],
  );

  const selectedContratoVigente = useMemo(() => {
    if (!selectedContratoDto) return null;
    return educacaoDtoToContratoServicoVigente(selectedContratoDto);
  }, [selectedContratoDto]);

  return (
    <section
      id="contratos-educacao"
      aria-label="Como o Fundo contrata"
      className="space-y-6"
    >
      <SectionHeader
        title="Como o Fundo contrata"
        description={`Contratos do Fundo vigentes em ${ano}: merenda escolar, transporte escolar, locação de imóveis (sem licitação, quando só aquele imóvel atende) e manutenção das escolas.`}
      />
      {/* Grade de categorias: 2 colunas no mobile, 3 + 2 no desktop */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-6">
        {CATEGORIAS_ORDENADAS.map((categoria, indice) => (
          <CategoriaContratoCard
            key={categoria}
            categoria={categoria}
            totais={totaisPorCategoria[categoria]}
            onOpen={setCategoriaAberta}
            className={cn(
              "md:col-span-2",
              indice === CATEGORIAS_ORDENADAS.length - 1 && "col-span-2",
            )}
          />
        ))}
      </div>
      {contratos.length === 0 && (
        <p className="text-mute text-sm">
          Nenhum contrato registrado no exercício.
        </p>
      )}

      {/* Tabela completa: linha compacta com detalhe expansível (padrão das licitações em aberto) */}
      {contratos.length > 0 && (
        <div className="space-y-3">
          <h3>Ver todos os contratos</h3>
          <ContratosTabela
            contratos={contratos}
            onOpenContrato={handleOpenContrato}
            exportFilename="contratos_educacao.csv"
          />
        </div>
      )}

      <LinhaLeiEFonte laws={[LEI_MERENDA, LEI_TRANSPORTE, LEI_LOCACAO]} />

      {/* Modal de lista da categoria (z-50); detalhes por cima (z-[60]) */}
      <ContratosCategoriaModal
        isOpen={categoriaAberta !== null}
        onClose={() => {
          if (selectedContratoDto) return;
          setCategoriaAberta(null);
        }}
        categoriaLabel={
          categoriaAberta ? formatCategoriaLabel(categoriaAberta) : ""
        }
        contratos={contratosDaCategoria}
        valorTotal={
          categoriaAberta
            ? totaisPorCategoria[categoriaAberta].valorContrato
            : 0
        }
        laws={categoriaAberta ? LEIS_DA_CATEGORIA[categoriaAberta] : undefined}
        onSelectContrato={handleOpenContrato}
      />

      {/* Modal Canônico de Detalhes 360° do Contrato Reutilizado */}
      <ContratoDetalhesModal
        contrato={selectedContratoVigente}
        isOpen={Boolean(selectedContratoVigente)}
        onClose={handleCloseModal}
        openedFromSearch={categoriaAberta !== null}
        backLabel="Voltar à lista"
        ano={ano}
        portalSlug={portalSlug}
        categoriaBadge={
          selectedContratoDto ? (
            <Badge variant="default" className="text-xs">
              {formatCategoriaLabel(selectedContratoDto.categoria)}
            </Badge>
          ) : undefined
        }
      />
    </section>
  );
}
