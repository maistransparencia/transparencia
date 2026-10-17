"use client";

import type {
  ContratoServicoVigente,
  EducacaoCategoriaContrato,
  EducacaoContratoDTO,
} from "@transparencia/db";
import { Badge, type Column, DenseTable, fmtDate } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContratoDetalhesModal } from "@/components/contrato-detalhes-modal";
import { ContratoServicoVigenteCard } from "@/components/contrato-servico-vigente-card";
import { SectionHeader } from "@/components/section-header";

export interface EducacaoContratosSectionProps {
  contratos: EducacaoContratoDTO[];
  initialContratoNumero?: string;
  portalSlug: string;
  ano?: number;
}

type FilterCategoria = EducacaoCategoriaContrato | "todas";

function formatCategoriaLabel(cat: EducacaoCategoriaContrato): string {
  if (cat === "merenda_pnae") return "Merenda Escolar (PNAE)";
  if (cat === "transporte_pnate") return "Transporte Escolar (PNATE)";
  if (cat === "manutencao_geral") return "Manutenção & Infraestrutura";
  return "Outros Suprimentos & Serviços";
}

function educacaoDtoToContratoServicoVigente(
  c: EducacaoContratoDTO,
): ContratoServicoVigente {
  const percentualPago =
    c.totalEmpenhado > 0 ? (c.totalPago / c.totalEmpenhado) * 100 : 0;
  const statusExecucao = (() => {
    if (c.totalPago >= c.totalEmpenhado && c.totalEmpenhado > 0) {
      return "concluido";
    }
    if (c.totalEmpenhado > 0 && c.totalPago === 0) {
      return "inexecutado";
    }
    return "em_execucao";
  })();

  return {
    contratoServicoId: c.contratoId,
    portalSlug: c.portalSlug,
    empresaId: c.empresaId,
    orgaoNome: c.orgaoNome,
    ano: c.ano,
    contratoNumero: c.contratoNumero,
    licitacaoNumero: c.licitacaoNumero,
    licitacaoAno: c.ano,
    fontePrincipal: c.fontePrincipal,
    fontesRecursos: c.fontesRecursos,
    programaNome: c.principalPrograma,
    projetoAtividadeNome: c.principalAcao,
    funcaoNome: c.principalFuncao,
    fornecedorNome: c.fornecedorNome,
    fornecedorCnpj: c.fornecedorCpfCnpj ?? "",
    objetoDescricao: c.objeto,
    dataInicio: c.dataInicio,
    vencimentoAtual: c.vencimentoAtual,
    valorContrato: c.valorContrato,
    valorAditado: c.valorAditado,
    totalEmpenhado: c.totalEmpenhado,
    totalLiquidado: c.totalLiquidado,
    totalPago: c.totalPago,
    saldoPendente: c.saldoAPagar,
    percentualPago,
    statusExecucao,
  };
}

export function EducacaoContratosSection({
  contratos,
  initialContratoNumero,
  portalSlug,
  ano,
}: EducacaoContratosSectionProps) {
  const [categoriaFilter, setCategoriaFilter] =
    useState<FilterCategoria>("todas");
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

  // Filtragem por categoria pedagógica
  const filteredContratos = useMemo(() => {
    if (categoriaFilter === "todas") return contratos;
    return contratos.filter((c) => c.categoria === categoriaFilter);
  }, [contratos, categoriaFilter]);

  // Contagem por categoria
  const counts = useMemo(() => {
    return {
      todas: contratos.length,
      merenda_pnae: contratos.filter((c) => c.categoria === "merenda_pnae")
        .length,
      transporte_pnate: contratos.filter(
        (c) => c.categoria === "transporte_pnate",
      ).length,
      manutencao_geral: contratos.filter(
        (c) => c.categoria === "manutencao_geral",
      ).length,
    };
  }, [contratos]);

  // Estrutura de dados enriquecida para a tabela idêntica à de Contratos de Serviços Vigentes
  const tableData = useMemo(() => {
    return filteredContratos.map((c) => {
      const contratoVigente = educacaoDtoToContratoServicoVigente(c);
      const statusLabel = (() => {
        if (contratoVigente.statusExecucao === "inexecutado") {
          return "Não Executado";
        }
        if (contratoVigente.statusExecucao === "concluido") {
          return "Concluído";
        }
        return "Em Execução";
      })();

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
  }, [filteredContratos]);

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
      accessorKey: "totalEmpenhado",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Liquidado",
      accessorKey: "totalLiquidado",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Pago",
      accessorKey: "totalPago",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Saldo Pendente",
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
        title="Contratos e Compras da Educação"
        description={
          <span>
            Auditoria dos contratos da pasta de ensino: merenda escolar (
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
              href="https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10880.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
              aria-label="Texto oficial da Lei nº 10.880/2004 (PNATE) no Planalto"
            >
              Lei nº 10.880/2004 (PNATE)
              <ExternalLink className="inline h-3 w-3" />
            </a>
            ) e manutenção das escolas.
          </span>
        }
      />

      {/* Segmented Filter Pills por Categoria Pedagógica */}
      <div
        className="flex flex-wrap items-center gap-2 border-slate-200/80 border-b pb-3"
        role="tablist"
        aria-label="Categorias de Contratos da Educação"
      >
        <span className="font-semibold text-slate-700 text-xs">
          Categoria Pedagógica:
        </span>
        <button
          type="button"
          role="tab"
          aria-selected={categoriaFilter === "todas"}
          onClick={() => setCategoriaFilter("todas")}
          className={`rounded-lg px-3 py-1 font-medium text-xs transition-colors ${
            categoriaFilter === "todas"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Todas ({counts.todas})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={categoriaFilter === "merenda_pnae"}
          onClick={() => setCategoriaFilter("merenda_pnae")}
          className={`rounded-lg px-3 py-1 font-medium text-xs transition-colors ${
            categoriaFilter === "merenda_pnae"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Merenda (PNAE) ({counts.merenda_pnae})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={categoriaFilter === "transporte_pnate"}
          onClick={() => setCategoriaFilter("transporte_pnate")}
          className={`rounded-lg px-3 py-1 font-medium text-xs transition-colors ${
            categoriaFilter === "transporte_pnate"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Transporte (PNATE) ({counts.transporte_pnate})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={categoriaFilter === "manutencao_geral"}
          onClick={() => setCategoriaFilter("manutencao_geral")}
          className={`rounded-lg px-3 py-1 font-medium text-xs transition-colors ${
            categoriaFilter === "manutencao_geral"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Manutenção & Obras ({counts.manutencao_geral})
        </button>
      </div>

      {/* Tabela Completa via DenseTable no formato canônico da página de Contratos */}
      <DenseTable
        data={tableData}
        columns={columns}
        renderMobileCard={(row) => (
          <ContratoServicoVigenteCard
            contrato={row}
            onOpenDetails={() => handleOpenContrato(row.rawDto)}
          />
        )}
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
      />

      {/* Modal Canônico de Detalhes 360° do Contrato Reutilizado */}
      <ContratoDetalhesModal
        contrato={selectedContratoVigente}
        isOpen={Boolean(selectedContratoVigente)}
        onClose={handleCloseModal}
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
