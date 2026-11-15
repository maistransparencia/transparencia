"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Download,
  Search,
} from "lucide-react";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import {
  fmtCompact,
  fmtCurrency,
  fmtDate,
  fmtNumber,
  fmtPercent,
} from "../utils/formatters";
import { Badge } from "./badge";

export interface Column<T> {
  header: string;
  exportHeader?: string;
  accessorKey?: keyof T;
  align?: "left" | "center" | "right";
  isSerifNumeric?: boolean;
  format?:
    | "currency"
    | "percent"
    | "number"
    | "compact"
    | "date"
    | "statusBadge"
    | "caspBadge";
  className?: string;
  sortable?: boolean;
  defaultSortDir?: "asc" | "desc";
  sortValue?: (row: T) => number | string;
  exportValue?: (row: T) => string | number;
  renderCell?: (row: T) => React.ReactNode;
  footer?: React.ReactNode;
  /** Coluna presente apenas na exportação CSV (não aparece na tabela). */
  exportOnly?: boolean;
}

export interface DenseTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchableKeys?: (keyof T)[];
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
  rowKey?: keyof T;
  sortable?: boolean;
  defaultSortKey?: keyof T;
  defaultSortDir?: "asc" | "desc";
  enableExportCsv?: boolean;
  exportFilename?: string;
  csvButtonLabel?: string;
  recordLabel?: string;
  renderMobileCard?: (row: T) => React.ReactNode;
  renderMobileRow?: (row: T) => {
    resumo: React.ReactNode;
    detalhes: React.ReactNode;
  };
  /** Painel de detalhe expansível por linha no desktop (seta no fim da linha). */
  renderExpandedRow?: (row: T) => React.ReactNode;
  hideSearch?: boolean;
  /** Oculta o botão de exportar CSV em telas < sm. */
  hideCsvOnMobile?: boolean;
  /**
   * Valor do `rowKey` da linha a ser revelada (deep link): a tabela vai até a
   * página que a contém, expande a linha e rola até ela. Requer `rowKey`.
   */
  revealRowId?: string | null;
  rowClassName?: (row: T, index: number) => string | undefined;
  onFilteredDataChange?: (rows: T[]) => void;
  footerLabel?: string;
}

function getAriaSort(
  isSortable: boolean,
  isSorted: boolean,
  sortDir: "asc" | "desc",
): "ascending" | "descending" | "none" | undefined {
  if (!isSortable) return undefined;
  if (!isSorted) return "none";
  return sortDir === "asc" ? "ascending" : "descending";
}

function SortIcon({
  isSorted,
  sortDir,
}: {
  isSorted: boolean;
  sortDir: "asc" | "desc";
}) {
  if (!isSorted) {
    return (
      <ChevronsUpDown className="h-3.5 w-3.5 opacity-35 hover:opacity-100" />
    );
  }
  if (sortDir === "asc") {
    return <ChevronUp className="text-brand h-3.5 w-3.5" />;
  }
  return <ChevronDown className="text-brand h-3.5 w-3.5" />;
}

// biome-ignore lint/suspicious/noExplicitAny: T accepts any typed object model
export function DenseTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Buscar...",
  searchableKeys,
  pageSize,
  emptyMessage = "Nenhum registro encontrado.",
  className,
  rowKey,
  sortable = false,
  defaultSortKey,
  defaultSortDir,
  enableExportCsv = true,
  exportFilename = "lancamentos.csv",
  csvButtonLabel = "Baixar CSV",
  recordLabel = "registros",
  renderMobileCard,
  renderMobileRow,
  renderExpandedRow,
  hideSearch = false,
  hideCsvOnMobile = false,
  revealRowId,
  rowClassName,
  onFilteredDataChange,
  footerLabel = "Total",
}: DenseTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sortSelectId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | null>(
    defaultSortKey ?? null,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    defaultSortDir ?? "asc",
  );
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.exportOnly),
    [columns],
  );
  const toggleExpandedRow = (rowId: string) =>
    setExpandedRowId((atual) => (atual === rowId ? null : rowId));

  // Chave estável: chamadores costumam passar `searchableKeys` como array literal
  const searchableKeysSignature = searchableKeys?.join("|");

  const filteredData = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) => {
      const keysToSearch =
        (searchableKeysSignature?.split("|") as (keyof T)[] | undefined) ??
        (Object.keys(row) as (keyof T)[]);
      return keysToSearch.some((k) => {
        const val = row[k];
        return (
          val !== null &&
          val !== undefined &&
          String(val).toLowerCase().includes(q)
        );
      });
    });
  }, [data, query, searchableKeysSignature]);

  useEffect(() => {
    onFilteredDataChange?.(filteredData);
  }, [filteredData, onFilteredDataChange]);

  const handleSort = (key?: keyof T) => {
    if (!key) return;
    setPage(1);
    setExpandedRowId(null);
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      const col = columns.find((c) => c.accessorKey === key);
      setSortDir(col?.defaultSortDir ?? "asc");
    }
  };

  const mobileSortableColumns = visibleColumns.filter(
    (col) => (col.sortable ?? sortable) && col.accessorKey !== undefined,
  );

  const handleMobileSortKeyChange = (value: string) => {
    setPage(1);
    setExpandedRowId(null);
    if (!value) {
      setSortKey(defaultSortKey ?? null);
      setSortDir(defaultSortDir ?? "asc");
      return;
    }
    const col = mobileSortableColumns.find(
      (c) => String(c.accessorKey) === value,
    );
    if (!col?.accessorKey) return;
    setSortKey(col.accessorKey);
    setSortDir(col.defaultSortDir ?? "asc");
  };

  const toggleSortDir = () => {
    setPage(1);
    setExpandedRowId(null);
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const activeCol = columns.find((c) => c.accessorKey === sortKey);

    return [...filteredData].sort((a, b) => {
      if (activeCol?.sortValue) {
        const valA = activeCol.sortValue(a);
        const valB = activeCol.sortValue(b);
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let cmp = 0;
        if (typeof valA === "number" && typeof valB === "number") {
          cmp = valA - valB;
        } else {
          cmp = String(valA).localeCompare(String(valB), "pt-BR", {
            numeric: true,
          });
        }
        return sortDir === "asc" ? cmp : -cmp;
      }

      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let cmp = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), "pt-BR", {
          numeric: true,
        });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir, columns]);

  const totalPages = pageSize
    ? Math.max(1, Math.ceil(sortedData.length / pageSize))
    : 1;
  const currentPage = Math.min(page, totalPages);

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.max(1, Math.min(newPage, totalPages));
    if (targetPage === currentPage) return;
    setPage(targetPage);
    setExpandedRowId(null);
    if (typeof containerRef.current?.scrollIntoView === "function") {
      containerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const displayedData = useMemo(() => {
    if (!pageSize) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pageSize, currentPage]);

  const revealedRowIdRef = useRef<string | null>(null);
  const pendingScrollRowIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!revealRowId || !rowKey) return;
    if (revealedRowIdRef.current === revealRowId) return;
    const index = sortedData.findIndex(
      (row) => String(row[rowKey]) === revealRowId,
    );
    if (index < 0) return;
    revealedRowIdRef.current = revealRowId;
    pendingScrollRowIdRef.current = revealRowId;
    if (pageSize) setPage(Math.floor(index / pageSize) + 1);
    setExpandedRowId(revealRowId);
  }, [revealRowId, rowKey, sortedData, pageSize]);

  useEffect(() => {
    const pendingId = pendingScrollRowIdRef.current;
    if (!pendingId || expandedRowId !== pendingId) return;
    pendingScrollRowIdRef.current = null;
    containerRef.current
      ?.querySelectorAll("[data-row-id]")
      .forEach((element) => {
        if (
          element.getAttribute("data-row-id") === pendingId &&
          typeof element.scrollIntoView === "function"
        ) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
  }, [expandedRowId]);

  const handleExportCsv = () => {
    if (!sortedData.length) return;
    const headerRow = columns
      .map((c) => `"${(c.exportHeader ?? c.header).replace(/"/g, '""')}"`)
      .join(",");
    const bodyRows = sortedData.map((row) =>
      columns
        .map((col) => {
          if (col.exportValue) {
            const val = col.exportValue(row);
            return `"${String(val ?? "").replace(/"/g, '""')}"`;
          }
          const val = col.accessorKey ? row[col.accessorKey] : "";
          const strVal = val === null || val === undefined ? "" : String(val);
          return `"${strVal.replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csvContent = `\uFEFF${[headerRow, ...bodyRows].join("\r\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", exportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getRowId = (row: T, idx: number): string => {
    if (rowKey && row[rowKey] !== undefined && row[rowKey] !== null) {
      return String(row[rowKey]);
    }
    const firstColKey = columns[0]?.accessorKey
      ? String(row[columns[0].accessorKey] ?? "")
      : "";
    return firstColKey ? `${firstColKey}-${idx}` : `row-${idx}`;
  };

  const renderCellValue = (col: Column<T>, row: T) => {
    if (col.renderCell) {
      return col.renderCell(row);
    }
    const raw = col.accessorKey ? row[col.accessorKey] : undefined;
    if (raw === null || raw === undefined) return "-";

    if (col.format === "date") {
      return fmtDate(String(raw));
    }
    if (col.format === "currency") {
      const num =
        typeof raw === "number"
          ? raw
          : parseFloat(String(raw).replace(",", ".")) || 0;
      return fmtCurrency(num);
    }
    if (col.format === "compact") {
      const num =
        typeof raw === "number"
          ? raw
          : parseFloat(String(raw).replace(",", ".")) || 0;
      return fmtCompact(num);
    }
    if (col.format === "percent") {
      const num = typeof raw === "number" ? raw : parseFloat(String(raw)) || 0;
      return fmtPercent(num);
    }
    if (col.format === "number") {
      const num = typeof raw === "number" ? raw : parseFloat(String(raw)) || 0;
      return fmtNumber(num);
    }
    if (col.format === "statusBadge") {
      const statusStr = String(raw).toLowerCase();
      const variant: "success" | "danger" | "warning" | "default" =
        statusStr === "normal"
          ? "success"
          : statusStr === "excesso"
            ? "danger"
            : statusStr === "baixa"
              ? "warning"
              : "default";
      return <Badge variant={variant}>{String(raw)}</Badge>;
    }
    if (col.format === "caspBadge") {
      return <Badge variant="default">{String(raw)}</Badge>;
    }

    return String(raw);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (currentPage > 3) {
      pages.push("ellipsis-start");
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push("ellipsis-end");
    }
    pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  const hasMobileRenderer = Boolean(renderMobileRow ?? renderMobileCard);

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-page scroll-mt-20 overflow-hidden sm:scroll-mt-24",
        className,
      )}
    >
      {((searchableKeys !== undefined && !hideSearch) || enableExportCsv) && (
        <div
          className={cn(
            "border-line items-center justify-between gap-2 border-b py-3",
            hideCsvOnMobile && (searchableKeys === undefined || hideSearch)
              ? "hidden sm:flex"
              : "flex",
          )}
        >
          {searchableKeys !== undefined && !hideSearch ? (
            <div className="flex flex-1 items-center gap-2">
              <Search className="text-mute2 h-4 w-4 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                  setExpandedRowId(null);
                }}
                placeholder={searchPlaceholder}
                className="text-ink placeholder:text-mute2 w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
          ) : (
            <div />
          )}

          {enableExportCsv && (
            <>
              {!hideCsvOnMobile && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={sortedData.length === 0}
                  aria-label={csvButtonLabel}
                  className="border-line bg-page text-ink hover:border-mute3 hover:bg-line2 inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border px-3 py-2.5 transition-colors disabled:opacity-40 sm:hidden"
                >
                  <Download className="text-mute2 h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={sortedData.length === 0}
                className="border-line bg-page text-ink hover:border-mute3 hover:bg-line2 hidden shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 sm:inline-flex"
              >
                <Download className="text-mute2 h-3.5 w-3.5" />
                <span>{csvButtonLabel}</span>
              </button>
            </>
          )}
        </div>
      )}

      {renderMobileRow &&
        mobileSortableColumns.length > 0 &&
        displayedData.length > 0 && (
          <div className="border-line flex items-center gap-2 border-b py-2 sm:hidden">
            <label htmlFor={`${sortSelectId}-mobile-sort`} className="eyebrow">
              Ordenar por
            </label>
            <select
              id={`${sortSelectId}-mobile-sort`}
              value={
                sortKey &&
                mobileSortableColumns.some((col) => col.accessorKey === sortKey)
                  ? String(sortKey)
                  : ""
              }
              onChange={(e) => handleMobileSortKeyChange(e.target.value)}
              className="border-line bg-page text-ink focus-visible:ring-brand min-w-0 flex-1 cursor-pointer rounded-md border px-2 py-1.5 text-xs focus:outline-none focus-visible:ring-2"
            >
              <option value="">Ordem padrão</option>
              {mobileSortableColumns.map((col) => (
                <option
                  key={String(col.accessorKey)}
                  value={String(col.accessorKey)}
                >
                  {col.header}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleSortDir}
              disabled={!sortKey}
              aria-label={
                sortDir === "asc"
                  ? "Ordem crescente, alternar para decrescente"
                  : "Ordem decrescente, alternar para crescente"
              }
              className="border-line bg-page text-ink hover:border-mute3 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sortDir === "asc" ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        )}

      {renderMobileRow && renderExpandedRow && displayedData.length > 0 && (
        <div className="border-line block border-b sm:hidden">
          {displayedData.map((row, idx) => {
            const rKey = getRowId(row, idx);
            const isExpanded = expandedRowId === rKey;
            const { resumo } = renderMobileRow(row);
            return (
              <div
                key={`m-${rKey}`}
                data-row-id={rKey}
                className="border-line border-b last:border-b-0"
              >
                {/* biome-ignore lint/a11y/useSemanticElements: o resumo contém links/botões próprios, então não pode ser um <button> */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={(event) => {
                    const alvo = event.target as HTMLElement;
                    const interativo = alvo.closest(
                      "a,button,input,select,textarea,summary,[role='button']",
                    );
                    if (interativo && interativo !== event.currentTarget) {
                      return;
                    }
                    toggleExpandedRow(rKey);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleExpandedRow(rKey);
                    }
                  }}
                  className="focus-visible:ring-brand flex cursor-pointer items-start gap-2 py-2.5 focus:outline-none focus-visible:ring-2"
                >
                  <div className="min-w-0 flex-1">{resumo}</div>
                  <ChevronRight
                    className={cn(
                      "text-mute mt-1 h-4 w-4 shrink-0 transition-transform",
                      isExpanded && "rotate-90",
                    )}
                    aria-hidden="true"
                  />
                </div>
                {isExpanded && (
                  <div className="border-line border-t px-3 py-3">
                    {renderExpandedRow(row)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {renderMobileRow && !renderExpandedRow && displayedData.length > 0 && (
        <div className="border-line block border-b sm:hidden">
          {displayedData.map((row, idx) => {
            const { resumo, detalhes } = renderMobileRow(row);
            return (
              <details
                key={rowKey ? String(row[rowKey]) : idx}
                className="group border-line border-b last:border-b-0"
              >
                <summary className="focus-visible:ring-brand flex cursor-pointer list-none items-start gap-2 py-2.5 focus:outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">{resumo}</div>
                  {detalhes ? (
                    <ChevronRight
                      className="text-mute mt-1 h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                  ) : null}
                </summary>
                <div className="pb-3 text-xs">{detalhes}</div>
              </details>
            );
          })}
        </div>
      )}

      {!renderMobileRow && renderMobileCard && displayedData.length > 0 && (
        <div className="divide-line border-line block divide-y border-b sm:hidden">
          {displayedData.map((row, idx) => (
            <div key={rowKey ? String(row[rowKey]) : idx} className="py-3.5">
              {renderMobileCard(row)}
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          "overflow-x-auto",
          hasMobileRenderer && displayedData.length > 0 && "hidden sm:block",
        )}
      >
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-line text-mute2 border-b font-semibold tracking-wider uppercase">
              {visibleColumns.map((col, _idx) => {
                const isSortable =
                  (col.sortable ?? sortable) && col.accessorKey !== undefined;
                const isSorted = sortKey === col.accessorKey;
                return (
                  <th
                    key={String(col.accessorKey || col.header)}
                    scope="col"
                    aria-sort={getAriaSort(isSortable, isSorted, sortDir)}
                    className={cn(
                      "px-3 py-2.5 select-none sm:px-4",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.accessorKey)}
                        aria-label={`Ordenar por ${col.header.toLowerCase()}`}
                        className={cn(
                          "hover:text-ink focus-visible:ring-brand inline-flex items-center gap-1.5 rounded px-1 font-bold uppercase transition-colors focus:outline-none focus-visible:ring-2",
                          col.align === "right" && "ml-auto justify-end",
                          col.align === "center" && "justify-center",
                        )}
                      >
                        <span>{col.header}</span>
                        <span className="text-mute3 inline-flex shrink-0 items-center">
                          <SortIcon isSorted={isSorted} sortDir={sortDir} />
                        </span>
                      </button>
                    ) : (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          col.align === "right" && "justify-end",
                          col.align === "center" && "justify-center",
                        )}
                      >
                        <span>{col.header}</span>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {displayedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="text-mute2 px-4 py-6 text-center italic"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayedData.map((row, index) => {
                const rKey = getRowId(row, index);
                const isExpanded =
                  renderExpandedRow !== undefined && expandedRowId === rKey;
                return (
                  <Fragment key={`tr-${rKey}`}>
                    <tr
                      data-row-id={rKey}
                      onClick={
                        renderExpandedRow
                          ? (event) => {
                              const alvo = event.target as HTMLElement;
                              if (
                                alvo.closest(
                                  "a,button,input,select,textarea,summary,[role='button']",
                                )
                              ) {
                                return;
                              }
                              toggleExpandedRow(rKey);
                            }
                          : undefined
                      }
                      className={cn(
                        "hover:bg-line2 transition-colors",
                        renderExpandedRow && "cursor-pointer",
                        isExpanded && "bg-line2",
                        rowClassName?.(row, index),
                      )}
                    >
                      {visibleColumns.map((col, colIndex) => (
                        <td
                          key={`td-${rKey}-${String(col.accessorKey || col.header)}`}
                          title={
                            col.accessorKey &&
                            row[col.accessorKey] !== null &&
                            row[col.accessorKey] !== undefined
                              ? String(row[col.accessorKey])
                              : undefined
                          }
                          className={cn(
                            col.className ? col.className : "whitespace-nowrap",
                            "text-ink px-3 py-2 sm:px-4",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                            (col.isSerifNumeric ||
                              col.format === "currency" ||
                              col.format === "compact") &&
                              "numeric",
                            row.className,
                          )}
                        >
                          {renderExpandedRow && colIndex === 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleExpandedRow(rKey)}
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded
                                    ? "Recolher detalhes da linha"
                                    : "Expandir detalhes da linha"
                                }
                                className="text-mute hover:text-ink focus-visible:ring-focus-ring inline-flex min-h-11 min-w-8 shrink-0 cursor-pointer items-center justify-center rounded focus:outline-none focus-visible:ring-2"
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-4 w-4 transition-transform",
                                    isExpanded && "rotate-90",
                                  )}
                                  aria-hidden="true"
                                />
                              </button>
                              <span className="min-w-0">
                                {renderCellValue(col, row)}
                              </span>
                            </div>
                          ) : (
                            renderCellValue(col, row)
                          )}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && renderExpandedRow && (
                      <tr className="border-line border-t hover:bg-transparent">
                        <td
                          colSpan={visibleColumns.length}
                          className="text-ink px-4 py-4"
                        >
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
          {visibleColumns.some((col) => col.footer !== undefined) && (
            <tfoot>
              <tr className="border-line text-ink border-t font-bold">
                {visibleColumns.map((col, idx) => (
                  <td
                    key={String(col.accessorKey || col.header)}
                    className={cn(
                      "px-3 py-3 whitespace-nowrap sm:px-4",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {col.footer ?? (idx === 0 ? footerLabel : null)}
                  </td>
                ))}
                {renderExpandedRow && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pageSize && (
        <div className="border-line text-mute2 flex flex-col items-center justify-between gap-3 border-t py-3 text-xs sm:flex-row">
          <div>
            Mostrando{" "}
            <span className="text-ink font-semibold">
              {displayedData.length}
            </span>{" "}
            de{" "}
            <span className="text-ink font-semibold">
              {filteredData.length}
            </span>{" "}
            {recordLabel}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="border-line text-ink hover:bg-line2 flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
              >
                &larr;
              </button>

              {pageNumbers.map((pageNum) =>
                typeof pageNum === "string" ? (
                  <span key={pageNum} className="text-mute3 px-1 font-semibold">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-btn-${pageNum}`}
                    type="button"
                    aria-label={`Página ${pageNum}`}
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold transition-colors sm:h-7 sm:w-7",
                      pageNum === currentPage
                        ? "bg-ink text-onink"
                        : "border-line text-ink hover:bg-line2 border",
                    )}
                  >
                    {pageNum}
                  </button>
                ),
              )}

              <button
                type="button"
                aria-label="Próxima página"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="border-line text-ink hover:bg-line2 flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
              >
                &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
