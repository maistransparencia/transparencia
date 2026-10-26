"use client";

import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Download,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  hideSearch?: boolean;
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
    return <ChevronUp className="h-3.5 w-3.5 text-brand" />;
  }
  return <ChevronDown className="h-3.5 w-3.5 text-brand" />;
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
  hideSearch = false,
  rowClassName,
  onFilteredDataChange,
  footerLabel = "Total",
}: DenseTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | null>(
    defaultSortKey ?? null,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    defaultSortDir ?? "asc",
  );

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
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      const col = columns.find((c) => c.accessorKey === key);
      setSortDir(col?.defaultSortDir ?? "asc");
    }
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
        "scroll-mt-20 overflow-hidden bg-page sm:scroll-mt-24",
        className,
      )}
    >
      {((searchableKeys !== undefined && !hideSearch) || enableExportCsv) && (
        <div className="flex items-center justify-between gap-2 border-line border-b py-3">
          {searchableKeys !== undefined && !hideSearch ? (
            <div className="flex flex-1 items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-mute2" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-ink text-xs placeholder:text-mute2 focus:outline-none"
              />
            </div>
          ) : (
            <div />
          )}

          {enableExportCsv && (
            <>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={sortedData.length === 0}
                aria-label={csvButtonLabel}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border border-line bg-page px-3 py-2.5 text-ink transition-colors hover:border-mute3 hover:bg-line2 disabled:opacity-40 sm:hidden"
              >
                <Download className="h-3.5 w-3.5 text-mute2" />
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={sortedData.length === 0}
                className="hidden shrink-0 items-center justify-center gap-1.5 rounded-md border border-line bg-page px-3 py-1.5 font-medium text-ink text-xs transition-colors hover:border-mute3 hover:bg-line2 disabled:opacity-40 sm:inline-flex"
              >
                <Download className="h-3.5 w-3.5 text-mute2" />
                <span>{csvButtonLabel}</span>
              </button>
            </>
          )}
        </div>
      )}

      {renderMobileRow && displayedData.length > 0 && (
        <div className="block border-line border-b sm:hidden">
          {displayedData.map((row, idx) => {
            const { resumo, detalhes } = renderMobileRow(row);
            return (
              <details
                key={rowKey ? String(row[rowKey]) : idx}
                className="group border-line border-b last:border-b-0"
              >
                <summary className="cursor-pointer list-none py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
                  {resumo}
                </summary>
                <div className="pb-3 text-xs">{detalhes}</div>
              </details>
            );
          })}
        </div>
      )}

      {!renderMobileRow && renderMobileCard && displayedData.length > 0 && (
        <div className="block divide-y divide-line border-line border-b sm:hidden">
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
            <tr className="border-ink border-b font-semibold text-mute2 uppercase tracking-wider">
              {columns.map((col, _idx) => {
                const isSortable =
                  (col.sortable ?? sortable) && col.accessorKey !== undefined;
                const isSorted = sortKey === col.accessorKey;
                return (
                  <th
                    key={String(col.accessorKey || col.header)}
                    scope="col"
                    aria-sort={getAriaSort(isSortable, isSorted, sortDir)}
                    className={cn(
                      "select-none px-3 py-2.5 sm:px-4",
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
                          "inline-flex items-center gap-1.5 rounded px-1 font-bold uppercase transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          col.align === "right" && "ml-auto justify-end",
                          col.align === "center" && "justify-center",
                        )}
                      >
                        <span>{col.header}</span>
                        <span className="inline-flex shrink-0 items-center text-mute3">
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
          <tbody className="divide-y divide-line">
            {displayedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-mute2 italic"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayedData.map((row, index) => {
                const rKey = getRowId(row, index);
                return (
                  <tr
                    key={`tr-${rKey}`}
                    className={cn(
                      "transition-colors hover:bg-line2",
                      rowClassName?.(row, index),
                    )}
                  >
                    {columns.map((col) => (
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
                          "px-3 py-2 text-ink sm:px-4",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          (col.isSerifNumeric ||
                            col.format === "currency" ||
                            col.format === "compact") &&
                            "font-semibold font-serif",
                          row.className,
                        )}
                      >
                        {renderCellValue(col, row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
          {columns.some((col) => col.footer !== undefined) && (
            <tfoot>
              <tr className="border-ink border-t-2 font-bold text-ink">
                {columns.map((col, idx) => (
                  <td
                    key={String(col.accessorKey || col.header)}
                    className={cn(
                      "whitespace-nowrap px-3 py-3 sm:px-4",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {col.footer ?? (idx === 0 ? footerLabel : null)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pageSize && (
        <div className="flex flex-col items-center justify-between gap-3 border-line border-t py-3 text-mute2 text-xs sm:flex-row">
          <div>
            Mostrando{" "}
            <span className="font-semibold text-ink">
              {displayedData.length}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-ink">
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
                className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink transition-colors hover:bg-line2 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
              >
                &larr;
              </button>

              {pageNumbers.map((pageNum) =>
                typeof pageNum === "string" ? (
                  <span key={pageNum} className="px-1 font-semibold text-mute3">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-btn-${pageNum}`}
                    type="button"
                    aria-label={`Página ${pageNum}`}
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md font-semibold text-xs transition-colors sm:h-7 sm:w-7",
                      pageNum === currentPage
                        ? "bg-ink text-onink"
                        : "border border-line text-ink hover:bg-line2",
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
                className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink transition-colors hover:bg-line2 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
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
