"use client";

import { cn, type MultiSelectOption, toTitleCase } from "@transparencia/ui";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface EntidadeSelectCompactProps {
  entidades?: MultiSelectOption[];
  selectedEntidades?: string[];
  onChange?: (selectedIds: string[]) => void;
  className?: string;
  disabled?: boolean;
}

export function EntidadeSelectCompact({
  entidades = [],
  selectedEntidades = [],
  onChange,
  className,
  disabled = false,
}: EntidadeSelectCompactProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasOptions = entidades.length > 0;
  const validOptionIds = new Set(entidades.map((opt) => opt.id));
  const validSelected = selectedEntidades.filter((id) =>
    validOptionIds.has(id),
  );

  const isAllSelected =
    validSelected.length === 0 ||
    (entidades.length > 0 && validSelected.length === entidades.length);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleAll = () => {
    onChange?.([]);
    setIsOpen(false);
  };

  const handleToggleOption = (id: string) => {
    if (!onChange) return;

    if (entidades.length <= 1) {
      return;
    }

    if (isAllSelected) {
      const allExcept = entidades
        .map((opt) => opt.id)
        .filter((item) => item !== id);
      onChange(allExcept);
      return;
    }

    if (validSelected.includes(id)) {
      const next = validSelected.filter((item) => item !== id);
      if (next.length === 0 || next.length === entidades.length) {
        onChange([]);
      } else {
        onChange(next);
      }
    } else {
      const next = [...validSelected, id];
      if (next.length === entidades.length) {
        onChange([]);
      } else {
        onChange(next);
      }
    }
  };

  const { label: triggerLabel, isFiltered } = (() => {
    if (!hasOptions) {
      return { label: "Nenhuma entidade", isFiltered: false };
    }
    if (isAllSelected) {
      return { label: "Consolidado", isFiltered: false };
    }
    if (validSelected.length === 1) {
      const found = entidades.find((opt) => opt.id === validSelected[0]);
      const friendlyName = found ? toTitleCase(found.nome) : "1 entidade";
      return { label: friendlyName, isFiltered: true };
    }
    return {
      label: `${validSelected.length} entidades`,
      isFiltered: true,
    };
  })();

  const isBtnDisabled = disabled || !hasOptions;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-fit max-w-[130px] border-borderLine border-b transition-colors focus-within:border-[#1d64d8] hover:border-gray-400 sm:max-w-[150px]",
        className,
      )}
    >
      <button
        type="button"
        disabled={isBtnDisabled}
        onClick={() => !isBtnDisabled && setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Filtrar entidades públicas municipais"
        className={cn(
          "flex min-h-[24px] w-full cursor-pointer appearance-none items-center justify-between gap-1 px-0 font-medium text-ink text-xs shadow-xs transition-colors focus:outline-none",
          isBtnDisabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {isFiltered && (
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d64d8]"
              aria-hidden="true"
            />
          )}
          <span className="truncate">{triggerLabel}</span>
        </span>
        <ChevronDown
          strokeWidth={1.6}
          className={cn(
            "h-3 w-3 shrink-0 text-mutedText transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && hasOptions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Perímetro Institucional"
          className="absolute top-full -left-16 z-50 mt-1.5 w-64 max-w-[calc(100vw-2.5rem)] rounded-lg border border-borderLine bg-white p-2.5 shadow-lg sm:-left-20"
        >
          {/* Cabeçalho do Popover com Resumo do Escopo Atual */}
          <div className="mb-2 flex items-center justify-between gap-2 border-borderLine border-b pb-2">
            <div>
              <span className="block font-semibold text-[10px] text-mutedText uppercase tracking-wider">
                Perímetro Institucional
              </span>
              <span className="text-[11px] text-subtleText">
                {isAllSelected
                  ? "Consolidado"
                  : `${validSelected.length} de ${entidades.length} selecionadas`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleAll}
              className={cn(
                "cursor-pointer rounded px-1.5 py-0.5 font-medium text-[11px] transition-colors hover:bg-gray-100",
                isAllSelected
                  ? "bg-blue-50 font-semibold text-[#1d64d8]"
                  : "text-mutedText hover:text-ink",
              )}
            >
              Todas (Consolidado)
            </button>
          </div>

          {/* Lista de Entidades com Checkboxes Semânticos */}
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {entidades.map((opt) => {
              const isChecked = isAllSelected || validSelected.includes(opt.id);
              return (
                // biome-ignore lint/a11y/useSemanticElements: custom styled checkbox button inside popover list
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  key={opt.id}
                  onClick={() => handleToggleOption(opt.id)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md p-1.5 text-left text-ink text-xs transition-colors hover:bg-gray-100/80"
                >
                  <div
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-borderLine transition-colors",
                      isChecked
                        ? "border-[#1d64d8] bg-[#1d64d8] text-white"
                        : "bg-white",
                    )}
                  >
                    {isChecked && (
                      <Check strokeWidth={2.5} className="h-2.5 w-2.5" />
                    )}
                  </div>
                  <span className="truncate">{toTitleCase(opt.nome)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
