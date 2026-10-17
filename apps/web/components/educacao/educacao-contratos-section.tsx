"use client";

import type {
  EducacaoCategoriaContrato,
  EducacaoContratoDTO,
} from "@transparencia/db";
import {
  Badge,
  cn,
  fmtCpfCnpj,
  fmtCurrency,
  fmtDate,
  ModalDialog,
} from "@transparencia/ui";
import {
  ExternalLink,
  FileText,
  Search,
  Truck,
  Utensils,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/section-header";

export interface EducacaoContratosSectionProps {
  contratos: EducacaoContratoDTO[];
  initialContratoNumero?: string;
  portalSlug: string;
}

type FilterCategoria = EducacaoCategoriaContrato | "todas";

function formatCategoriaLabel(cat: EducacaoCategoriaContrato): string {
  if (cat === "merenda_pnae") return "Merenda Escolar (PNAE)";
  if (cat === "transporte_pnate") return "Transporte Escolar (PNATE)";
  if (cat === "manutencao_geral") return "Manutenção & Infraestrutura";
  return "Outros Suprimentos & Serviços";
}

function getCategoriaIcon(cat: EducacaoCategoriaContrato) {
  if (cat === "merenda_pnae") {
    return <Utensils className="h-3.5 w-3.5 text-amber-600" />;
  }
  if (cat === "transporte_pnate") {
    return <Truck className="h-3.5 w-3.5 text-sky-600" />;
  }
  if (cat === "manutencao_geral") {
    return <Wrench className="h-3.5 w-3.5 text-emerald-600" />;
  }
  return <FileText className="h-3.5 w-3.5 text-slate-500" />;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function EducacaoContratosSection({
  contratos,
  initialContratoNumero,
  _portalSlug,
}: EducacaoContratosSectionProps) {
  const [categoriaFilter, setCategoriaFilter] =
    useState<FilterCategoria>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContrato, setSelectedContrato] =
    useState<EducacaoContratoDTO | null>(null);

  // Sincronização com URL (?contratoNumero=...) incluindo popstate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const termo = (urlParams.get("contratoNumero") || "").trim();

      if (!termo) {
        setSelectedContrato(null);
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

      setSelectedContrato(match ?? null);
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
      if (match) setSelectedContrato(match);
    } else {
      syncFromUrl();
    }

    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, [contratos, initialContratoNumero]);

  const handleOpenModal = useCallback((c: EducacaoContratoDTO) => {
    setSelectedContrato(c);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("contratoNumero", c.contratoNumero);
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedContrato(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("contratoNumero");
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  // Filtragem combinada por categoria e texto de busca (insensível a acentuação - Regra 11)
  const filteredContratos = useMemo(() => {
    return contratos.filter((c) => {
      if (categoriaFilter !== "todas" && c.categoria !== categoriaFilter) {
        return false;
      }
      if (searchTerm.trim() !== "") {
        const term = normalizeText(searchTerm.trim());
        const matchesFornecedor = normalizeText(c.fornecedorNome).includes(
          term,
        );
        const matchesNumero = normalizeText(c.contratoNumero).includes(term);
        const matchesObjeto = normalizeText(c.objeto).includes(term);
        const matchesLicitacao = normalizeText(
          c.licitacaoNumero ?? "",
        ).includes(term);
        return (
          matchesFornecedor ||
          matchesNumero ||
          matchesObjeto ||
          matchesLicitacao
        );
      }
      return true;
    });
  }, [contratos, categoriaFilter, searchTerm]);

  return (
    <section
      id="contratos-educacao"
      aria-label="Contratos e Compras da Educação"
      className="space-y-4"
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

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
        {/* Filtros de Categoria */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Categorias de Contratos"
        >
          <button
            type="button"
            role="tab"
            aria-selected={categoriaFilter === "todas"}
            onClick={() => setCategoriaFilter("todas")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-sky-500",
              categoriaFilter === "todas"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            Todas ({contratos.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={categoriaFilter === "merenda_pnae"}
            onClick={() => setCategoriaFilter("merenda_pnae")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-sky-500",
              categoriaFilter === "merenda_pnae"
                ? "bg-amber-600 text-white shadow-xs"
                : "border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
            )}
          >
            <Utensils className="h-3 w-3" />
            Merenda (PNAE)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={categoriaFilter === "transporte_pnate"}
            onClick={() => setCategoriaFilter("transporte_pnate")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-sky-500",
              categoriaFilter === "transporte_pnate"
                ? "bg-sky-600 text-white shadow-xs"
                : "border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
            )}
          >
            <Truck className="h-3 w-3" />
            Transporte (PNATE)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={categoriaFilter === "manutencao_geral"}
            onClick={() => setCategoriaFilter("manutencao_geral")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-sky-500",
              categoriaFilter === "manutencao_geral"
                ? "bg-emerald-700 text-white shadow-xs"
                : "border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
            )}
          >
            <Wrench className="h-3 w-3" />
            Manutenção & Obras
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[240px] md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar fornecedor, número..."
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-slate-900 text-xs placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Listagem em Tabela Auditável */}
      {filteredContratos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 border-dashed bg-slate-50 p-8 text-center text-slate-500 text-xs">
          <p className="font-semibold text-slate-700 text-sm">
            Nenhum contrato encontrado para os critérios selecionados
          </p>
          <p className="mt-1">
            Tente limpar a busca ou selecionar outra categoria pedagógica.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-borderLine bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-600 text-xs">
              <thead className="border-slate-200 border-b bg-slate-50 font-semibold text-[11px] text-slate-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Contrato / Ano
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Categoria
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Fornecedor
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Objeto
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Valor Contratado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Total Pago
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContratos.map((c) => (
                  <tr
                    key={c.contratoId || c.contratoNumero}
                    className="transition-colors hover:bg-slate-50/80"
                    data-testid={`contrato-row-${c.contratoNumero}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="block font-bold font-mono text-slate-900">
                        {c.contratoNumero}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {c.ano}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-[11px] text-slate-800">
                        {getCategoriaIcon(c.categoria)}
                        {formatCategoriaLabel(c.categoria)}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3">
                      <span
                        className="block truncate font-medium text-slate-900"
                        title={c.fornecedorNome}
                      >
                        {c.fornecedorNome}
                      </span>
                      {c.fornecedorCpfCnpj && (
                        <span className="font-mono text-[11px] text-slate-400">
                          {fmtCpfCnpj(c.fornecedorCpfCnpj)}
                        </span>
                      )}
                    </td>
                    <td
                      className="max-w-[240px] truncate px-4 py-3"
                      title={c.objeto}
                    >
                      {c.objeto}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
                      {fmtCurrency(c.valorContrato)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-700">
                      {fmtCurrency(c.totalPago)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(c)}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 text-xs shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Padronizado de Detalhes do Contrato (Regra 24) */}
      <ModalDialog
        isOpen={selectedContrato !== null}
        onClose={handleCloseModal}
        title="Detalhes do Contrato"
        subtitle={
          selectedContrato?.contratoNumero ? (
            <span className="font-mono">
              Contrato nº {selectedContrato.contratoNumero}
            </span>
          ) : undefined
        }
        badge={
          selectedContrato ? (
            <Badge variant="default" className="text-xs">
              {formatCategoriaLabel(selectedContrato.categoria)}
            </Badge>
          ) : undefined
        }
        maxWidth="3xl"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 text-xs transition-colors hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        }
      >
        {selectedContrato && (
          <div
            className="space-y-5 text-slate-700 text-xs"
            data-testid="contrato-detalhes-modal"
          >
            {/* Informações Gerais */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold font-serif text-slate-900 text-sm">
                  Objeto Contratual
                </h4>
                {selectedContrato.categoria === "merenda_pnae" && (
                  <a
                    href="https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l11947.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[11px] text-sky-700 underline underline-offset-2 hover:text-sky-900"
                    aria-label="Texto oficial da Lei nº 11.947/2009 (PNAE) no Planalto"
                  >
                    <span>Lei nº 11.947/2009 (PNAE)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {selectedContrato.categoria === "transporte_pnate" && (
                  <a
                    href="https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10880.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[11px] text-sky-700 underline underline-offset-2 hover:text-sky-900"
                    aria-label="Texto oficial da Lei nº 10.880/2004 (PNATE) no Planalto"
                  >
                    <span>Lei nº 10.880/2004 (PNATE)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-slate-700 text-xs leading-relaxed">
                {selectedContrato.objeto}
              </p>
            </div>

            {/* Grid Fornecedor e Vigência */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1 rounded-lg border border-slate-200 p-3.5">
                <span className="block font-semibold text-[11px] text-slate-400 uppercase tracking-wider">
                  Fornecedor
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedContrato.fornecedorNome}
                </p>
                {selectedContrato.fornecedorCpfCnpj && (
                  <p className="font-mono text-slate-500 text-xs">
                    CNPJ/CPF: {fmtCpfCnpj(selectedContrato.fornecedorCpfCnpj)}
                  </p>
                )}
              </div>

              <div className="space-y-1 rounded-lg border border-slate-200 p-3.5">
                <span className="block font-semibold text-[11px] text-slate-400 uppercase tracking-wider">
                  Vigência & Modalidade
                </span>
                <p className="text-slate-800 text-xs">
                  Início:{" "}
                  <strong className="text-slate-900">
                    {selectedContrato.dataInicio
                      ? fmtDate(selectedContrato.dataInicio)
                      : "Não informada"}
                  </strong>
                </p>
                <p className="text-slate-800 text-xs">
                  Vencimento:{" "}
                  <strong className="text-slate-900">
                    {selectedContrato.vencimentoAtual
                      ? fmtDate(selectedContrato.vencimentoAtual)
                      : "Não informado"}
                  </strong>
                </p>
                {selectedContrato.modalidade && (
                  <p className="text-[11px] text-slate-500">
                    Modalidade: {selectedContrato.modalidade}
                  </p>
                )}
              </div>
            </div>

            {/* Execução Financeira */}
            <div className="space-y-2">
              <h4 className="font-bold font-serif text-slate-900 text-sm">
                Execução Financeira
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <span className="block text-[11px] text-slate-500">
                    Valor Contratado
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {fmtCurrency(selectedContrato.valorContrato)}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <span className="block text-[11px] text-slate-500">
                    Total Empenhado
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {fmtCurrency(selectedContrato.totalEmpenhado)}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <span className="block text-[11px] text-slate-500">
                    Total Liquidado
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {fmtCurrency(selectedContrato.totalLiquidado)}
                  </span>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <span className="block text-[11px] text-emerald-800">
                    Total Pago
                  </span>
                  <span className="font-bold text-emerald-900 text-sm">
                    {fmtCurrency(selectedContrato.totalPago)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fontes e Classificação Orçamentária */}
            <div className="space-y-2 rounded-lg border border-slate-200 p-4">
              <h4 className="font-bold font-serif text-slate-900 text-sm">
                Fontes de Recurso & Órgão
              </h4>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="block text-[11px] text-slate-400">
                    Órgão Responsável:
                  </span>
                  <span className="font-medium text-slate-800">
                    {selectedContrato.orgaoNome ||
                      "Secretaria Municipal de Educação"}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">
                    Função:
                  </span>
                  <span className="font-medium text-slate-800">
                    {selectedContrato.principalFuncao || "12 - Educação"}
                  </span>
                </div>
                {selectedContrato.fontePrincipal && (
                  <div>
                    <span className="block text-[11px] text-slate-400">
                      Fonte Principal:
                    </span>
                    <span className="font-medium text-slate-800">
                      {selectedContrato.fontePrincipal}
                    </span>
                  </div>
                )}
                {selectedContrato.fontesRecursos && (
                  <div>
                    <span className="block text-[11px] text-slate-400">
                      Fontes de Recursos:
                    </span>
                    <span className="font-medium text-slate-800">
                      {selectedContrato.fontesRecursos}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ModalDialog>
    </section>
  );
}
