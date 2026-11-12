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

  const handleSelectOnly = (id: string) => {
    onChange?.([id]);
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
      return { label: "Nenhum órgão", isFiltered: false };
    }
    if (isAllSelected) {
      return { label: "Todos os órgãos", isFiltered: false };
    }
    if (validSelected.length === 1) {
      const found = entidades.find((opt) => opt.id === validSelected[0]);
      const friendlyName = found ? toTitleCase(found.nome) : "1 órgão";
      return { label: friendlyName, isFiltered: true };
    }
    return {
      label: `${validSelected.length} órgãos`,
      isFiltered: true,
    };
  })();

  const isBtnDisabled = disabled || !hasOptions;

  return (
    <div
      ref={containerRef}
      className={cn(
        "border-line focus-within:border-ink hover:border-mute3 w-fit max-w-[200px] border-b transition-colors sm:relative sm:max-w-[260px]",
        className,
      )}
    >
      <button
        type="button"
        disabled={isBtnDisabled}
        onClick={() => !isBtnDisabled && setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${triggerLabel}, escolher órgãos do município`}
        className={cn(
          "text-ink relative flex min-h-[24px] w-full cursor-pointer appearance-none items-center pr-5 pl-0 text-xs font-medium shadow-xs transition-colors focus:outline-none sm:min-h-0 sm:py-0.5",
          isBtnDisabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {isFiltered && (
            <span
              className="bg-brand-fill inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              aria-hidden="true"
            />
          )}
          <span className="truncate">{triggerLabel}</span>
        </span>
        <ChevronDown
          strokeWidth={1.6}
          className={cn(
            "text-mute2 pointer-events-none absolute top-1/2 right-0.5 h-4 w-4 -translate-y-1/2 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && hasOptions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Órgãos do município"
          className="border-line bg-page absolute top-full right-4 left-4 z-50 mt-1.5 rounded-lg border p-2 shadow-lg sm:right-auto sm:-left-20 sm:w-80"
        >
          {/* Cabeçalho do Popover com Resumo do Escopo Atual */}
          <div className="border-line mb-1.5 flex items-center justify-between gap-2 border-b pb-1.5">
            <div>
              <span className="text-mute2 block text-[10px] font-semibold tracking-wider uppercase">
                Órgãos do município
              </span>
              <span className="text-mute text-[11px]">
                {isAllSelected
                  ? "Todos selecionados"
                  : `${validSelected.length} de ${entidades.length} selecionados`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleAll}
              className={cn(
                "hover:bg-line2 cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                isAllSelected
                  ? "bg-brand/10 text-brand-text font-semibold"
                  : "text-mute2 hover:text-ink",
              )}
            >
              Marcar todos
            </button>
          </div>

          {/* Lista de Entidades com Checkboxes Semânticos e Seleção Rápida */}
          <div className="max-h-[360px] space-y-0.5 overflow-y-auto sm:max-h-80">
            {entidades.map((opt) => {
              const isChecked = isAllSelected || validSelected.includes(opt.id);
              return (
                // biome-ignore lint/a11y/useSemanticElements: custom styled option group containing sibling buttons
                <div
                  key={opt.id}
                  role="group"
                  aria-label={toTitleCase(opt.nome)}
                  className="group/row text-ink hover:bg-line2/80 flex w-full items-center justify-between rounded-md px-1 py-0.5 text-xs transition-colors"
                >
                  {/* biome-ignore lint/a11y/useSemanticElements: custom styled checkbox button inside popover list */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    aria-label={`Alternar seleção de ${toTitleCase(opt.nome)}`}
                    onClick={() => handleToggleOption(opt.id)}
                    className="focus-visible:ring-brand flex min-h-[32px] shrink-0 cursor-pointer items-center justify-center rounded-sm p-1.5 focus:outline-none focus-visible:ring-1 sm:min-h-0 sm:p-1"
                  >
                    <div
                      className={cn(
                        "border-line flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors",
                        isChecked
                          ? "border-brand bg-brand-fill text-onink"
                          : "bg-page",
                      )}
                    >
                      {isChecked && (
                        <Check strokeWidth={2.5} className="h-2.5 w-2.5" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectOnly(opt.id)}
                    aria-label={`Selecionar apenas ${toTitleCase(opt.nome)}`}
                    title={`Selecionar apenas ${toTitleCase(opt.nome)}`}
                    className="group/label focus-visible:ring-brand relative flex min-w-0 flex-1 cursor-pointer items-center overflow-hidden rounded-sm py-1 pr-1 pl-1 text-left text-xs focus:outline-none focus-visible:ring-1"
                  >
                    <span className="truncate">{toTitleCase(opt.nome)}</span>
                    <span
                      className="from-line2 via-line2/95 absolute inset-y-0 right-0 hidden items-center bg-gradient-to-l to-transparent pr-1 pl-6 group-hover/label:sm:flex"
                      aria-hidden="true"
                    >
                      <span className="border-brand/30 bg-brand/10 text-brand-text rounded border px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
                        apenas
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
