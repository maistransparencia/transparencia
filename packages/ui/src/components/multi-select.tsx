"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { toTitleCase } from "../utils/text";

export interface MultiSelectOption {
  id: string;
  nome: string;
}

export interface MultiSelectProps {
  options?: MultiSelectOption[];
  selectedIds?: string[];
  onChange?: (selectedIds: string[]) => void;
  labelAll?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options = [],
  selectedIds = [],
  onChange,
  labelAll = "Todas as entidades",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

    document.addEventListener("mousedown", handleClickOutside);
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const hasOptions = options.length > 0;
  const isAllSelected =
    selectedIds.length === 0 || selectedIds.length === options.length;

  const handleToggleAll = () => {
    onChange?.([]);
  };

  const handleSelectOnly = (id: string) => {
    onChange?.([id]);
  };

  const handleToggleOption = (id: string) => {
    if (!onChange) return;
    if (selectedIds.length === 0) {
      const allExcept = options
        .map((opt) => opt.id)
        .filter((item) => item !== id);
      onChange(allExcept);
      return;
    }

    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((item) => item !== id);
      onChange(next);
    } else {
      const next = [...selectedIds, id];
      if (next.length === options.length) {
        onChange([]);
      } else {
        onChange(next);
      }
    }
  };

  let displayText = labelAll;
  if (!hasOptions) {
    displayText = "Nenhuma entidade cadastrada";
  } else if (!isAllSelected && selectedIds.length > 0) {
    if (selectedIds.length === 1) {
      const found = options.find((o) => o.id === selectedIds[0]);
      displayText = found
        ? toTitleCase(found.nome)
        : `${selectedIds.length} selecionada`;
    } else {
      displayText = `${selectedIds.length} selecionadas`;
    }
  }

  const isBtnDisabled = disabled || !hasOptions;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={isBtnDisabled}
        onClick={() => !isBtnDisabled && setIsOpen(!isOpen)}
        className={cn(
          "flex min-h-[44px] w-full items-center justify-between rounded-md border border-line bg-page px-2.5 py-2 text-ink text-xs transition-colors sm:min-h-0",
          isBtnDisabled
            ? "cursor-not-allowed text-mute2 opacity-60"
            : "hover:border-mute3 focus:border-ink focus:outline-none",
        )}
      >
        <span className="truncate pr-2 font-medium">{displayText}</span>
        <ChevronDown
          strokeWidth={1.6}
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-mute2 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && hasOptions && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-line bg-page py-1 text-xs shadow-lg">
          <button
            type="button"
            onClick={handleToggleAll}
            className="flex min-h-[36px] w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left font-medium text-ink hover:bg-line2 sm:min-h-0 sm:py-1.5"
          >
            <div
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-line transition-colors",
                isAllSelected ? "border-ink bg-ink text-onink" : "bg-page",
              )}
            >
              {isAllSelected && (
                <Check strokeWidth={2.5} className="h-2.5 w-2.5" />
              )}
            </div>
            <span className="truncate">{labelAll}</span>
          </button>

          <div className="my-1 border-line2 border-t" />

          {options.map((opt) => {
            const isChecked = isAllSelected || selectedIds.includes(opt.id);
            return (
              // biome-ignore lint/a11y/useSemanticElements: custom styled option group containing sibling buttons
              <div
                key={opt.id}
                role="group"
                aria-label={toTitleCase(opt.nome)}
                className="group/row flex min-h-[34px] w-full items-center justify-between rounded-sm px-1.5 text-ink hover:bg-line2 sm:min-h-0 sm:py-0.5"
              >
                {/* biome-ignore lint/a11y/useSemanticElements: custom styled checkbox button */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  aria-label={`Alternar seleção de ${toTitleCase(opt.nome)}`}
                  onClick={() => handleToggleOption(opt.id)}
                  className="flex min-h-[32px] shrink-0 cursor-pointer items-center justify-center rounded-sm p-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-ink sm:min-h-0 sm:p-1"
                >
                  <div
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded border border-line transition-colors",
                      isChecked ? "border-ink bg-ink text-onink" : "bg-page",
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
                  className="group/label relative flex min-w-0 flex-1 cursor-pointer items-center overflow-hidden rounded-sm py-1 pr-1 pl-1.5 text-left text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-ink"
                >
                  <span className="truncate">{toTitleCase(opt.nome)}</span>
                  <span
                    className="absolute inset-y-0 right-0 hidden items-center bg-gradient-to-l from-line2 via-line2 to-transparent pr-1 pl-6 group-hover/label:sm:flex"
                    aria-hidden="true"
                  >
                    <span className="rounded border border-line bg-page px-1.5 py-0.5 font-medium text-[11px] text-ink">
                      apenas
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
