"use client";

import type {
  EducacaoCategoriaContrato,
  EducacaoContratoDTO,
} from "@transparencia/db";
import {
  Badge,
  type Column,
  cn,
  DenseTable,
  fmtCurrency,
  fmtDate,
} from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EducacaoContratosCategoriaTotais } from "@/app/[portalSlug]/educacao/view-model";
import { ContratoDetalhesModal } from "@/components/contrato-detalhes-modal";
import { SectionHeader } from "@/components/section-header";
import { CategoriaContratoCard } from "./categoria-contrato-card";
import { ContratosCategoriaModal } from "./contratos-categoria-modal";
import {
  educacaoDtoToContratoServicoVigente,
  formatCategoriaLabel,
  formatStatusExecucaoLabel,
} from "./educacao-contratos-utils";

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

  // Contratos após filtro de categoria e busca (independe da paginação)
  const [contratosVisiveis, setContratosVisiveis] = useState<
    EducacaoContratoDTO[] | null
  >(null);
  const handleFilteredDataChange = useCallback(
    (rows: { rawDto: EducacaoContratoDTO }[]) => {
      setContratosVisiveis(rows.map((row) => row.rawDto));
    },
    [],
  );

  const totaisContratos = useMemo(() => {
    const base = contratosVisiveis ?? contratos;
    return {
      empenhado: base.reduce((acc, c) => acc + (c.totalEmpenhado || 0), 0),
      liquidado: base.reduce((acc, c) => acc + (c.totalLiquidado || 0), 0),
      pago: base.reduce((acc, c) => acc + (c.totalPago || 0), 0),
      saldoPendente: base.reduce((acc, c) => acc + (c.saldoAPagar || 0), 0),
    };
  }, [contratosVisiveis, contratos]);

  // Estrutura de dados enriquecida para a tabela idêntica à de Contratos de Serviços Vigentes
  const tableData = useMemo(() => {
    return contratos.map((c) => {
      const contratoVigente = educacaoDtoToContratoServicoVigente(c);
      const statusLabel = formatStatusExecucaoLabel(
        contratoVigente.statusExecucao,
      );

      const vigenciaFormatada = (() => {
        if (c.dataInicio && c.vencimentoAtual) {
          return `${fmtDate(c.dataInicio)} – ${fmtDate(c.vencimentoAtual)}`;
        }
        if (c.vencimentoAtual) {
          return `Até ${fmtDate(c.vencimentoAtual)}`;
        }
        if (c.dataInicio) {
          return `A partir de ${fmtDate(c.dataInicio)}`;
        }
        return "—";
      })();

      return {
        ...contratoVigente,
        rawDto: c,
        statusLabel,
        vigenciaFormatada,
      };
    });
  }, [contratos]);

  // Colunas rigorosamente no mesmo formato e ordem da página canônica de Contratos
  const columns: Column<(typeof tableData)[number]>[] = [
    {
      header: "Fornecedor",
      accessorKey: "fornecedorNome",
      sortable: true,
      className: "min-w-[180px] max-w-[220px]",
      renderCell: (row) => (
        <div data-testid={`contrato-row-${row.contratoNumero}`}>
          <button
            type="button"
            onClick={() => handleOpenContrato(row.rawDto)}
            className="cursor-pointer text-left font-medium text-slate-900 hover:text-blue-600 hover:underline"
            title="Ver detalhes do contrato"
          >
            {row.fornecedorNome}
          </button>
        </div>
      ),
    },
    {
      header: "Objeto",
      accessorKey: "objetoDescricao",
      sortable: true,
      className: "min-w-[220px] max-w-[320px]",
      renderCell: (row) => (
        <div className="space-y-1">
          <p
            className="line-clamp-2 font-normal text-slate-700 text-xs leading-relaxed"
            title={row.objetoDescricao}
          >
            {row.objetoDescricao || "—"}
          </p>
          <button
            type="button"
            onClick={() => handleOpenContrato(row.rawDto)}
            className="inline-flex cursor-pointer items-center gap-1 font-medium text-blue-600 text-xs hover:text-blue-800 hover:underline"
            title="Abrir detalhes completos do contrato"
          >
            <span>Detalhes</span>
          </button>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "statusLabel",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap font-medium text-slate-700 text-xs",
    },
    {
      header: "Vigência",
      accessorKey: "vigenciaFormatada",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap font-medium text-slate-600",
    },
    {
      header: "Empenhado",
      footer: fmtCurrency(totaisContratos.empenhado),
      accessorKey: "totalEmpenhado",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Liquidado",
      footer: fmtCurrency(totaisContratos.liquidado),
      accessorKey: "totalLiquidado",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Pago",
      footer: fmtCurrency(totaisContratos.pago),
      accessorKey: "totalPago",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Saldo Pendente",
      footer: fmtCurrency(totaisContratos.saldoPendente),
      accessorKey: "saldoPendente",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "% Pago",
      accessorKey: "percentualPago",
      format: "percent",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
  ];

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
      aria-label="Contratos e Compras da Educação"
      className="space-y-6"
    >
      <SectionHeader
        title={`Contratos e Compras da Educação${ano ? ` · Exercício ${ano}` : ""}`}
        description={
          <span>
            Auditoria dos contratos da pasta de ensino vigentes no exercício:
            merenda escolar (
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l11947.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
              aria-label="Texto oficial da Lei nº 11.947/2009 (PNAE) no Planalto"
            >
              Lei nº 11.947/2009 (PNAE)
              <ExternalLink className="inline h-3 w-3" />
            </a>
            ), transporte escolar (
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.880.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
              aria-label="Texto oficial da Lei nº 10.880/2004 (PNATE) no Planalto"
            >
              Lei nº 10.880/2004 (PNATE)
              <ExternalLink className="inline h-3 w-3" />
            </a>
            ), locação de imóveis (
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art74v"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
              aria-label="Texto oficial da Lei nº 14.133/2021, Art. 74, V (Locação de Imóveis) no Planalto"
            >
              Lei nº 14.133/2021, Art. 74, V
              <ExternalLink className="inline h-3 w-3" />
            </a>
            ), manutenção das escolas e suprimentos operacionais.
          </span>
        }
      />

      {/* Grade de categorias: 2 colunas no mobile, 3 + 2 no desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
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
        <p className="text-slate-500 text-sm">
          Nenhum contrato registrado no exercício.
        </p>
      )}

      {/* Tabela completa: apenas em md+ */}
      {contratos.length > 0 && (
        <div className="hidden space-y-3 md:block">
          <h3 className="font-semibold font-serif text-lg text-slate-900">
            Ver todos os contratos
          </h3>
          <DenseTable
            data={tableData}
            columns={columns}
            searchPlaceholder="Buscar por fornecedor, CNPJ ou objeto..."
            searchableKeys={[
              "contratoNumero",
              "fornecedorNome",
              "fornecedorCnpj",
              "objetoDescricao",
            ]}
            pageSize={10}
            sortable={true}
            enableExportCsv={true}
            exportFilename="contratos_educacao.csv"
            rowKey="contratoServicoId"
            onFilteredDataChange={handleFilteredDataChange}
          />
        </div>
      )}

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
        onSelectContrato={handleOpenContrato}
        detalheAberto={selectedContratoDto !== null}
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
