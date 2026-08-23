"use client";

import { ArrowUpRight, ExternalLink, Search, Sparkles } from "lucide-react";
import Link from "next/link";

export type FallbackChip =
  | {
      type: "prompt";
      label: string;
      prompt: string;
      icon?: "Search" | "Sparkles";
    }
  | {
      type: "link";
      label: string;
      href: string;
      icon?: "ExternalLink" | "ArrowUpRight";
    };

interface AssistantFallbackChipsProps {
  chips: FallbackChip[];
  onSelectPrompt: (prompt: string) => void;
  portalSlug: string;
}

export function AssistantFallbackChips({
  chips,
  onSelectPrompt,
  portalSlug,
}: AssistantFallbackChipsProps) {
  if (!Array.isArray(chips) || chips.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
        Que tal tentar uma destas opções?
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, index) => {
          const key = `${chip.type}-${chip.label}-${index}`;

          if (chip.type === "prompt") {
            const Icon = chip.icon === "Sparkles" ? Sparkles : Search;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectPrompt(chip.prompt)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#5a72a8]/30 bg-white px-2.5 py-1.5 font-medium text-slate-700 text-xs shadow-2xs transition-all hover:border-[#5a72a8] hover:bg-[#5a72a8]/10 hover:text-slate-900"
              >
                <Icon className="h-3.5 w-3.5 text-[#5a72a8]" />
                <span>{chip.label}</span>
              </button>
            );
          }

          const Icon =
            chip.icon === "ArrowUpRight" ? ArrowUpRight : ExternalLink;
          const targetHref = chip.href.startsWith("/")
            ? `/${portalSlug}${chip.href}`
            : chip.href;

          return (
            <Link
              key={key}
              href={targetHref}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50/80 px-2.5 py-1.5 font-medium text-emerald-900 text-xs shadow-2xs transition-all hover:border-emerald-500 hover:bg-emerald-100"
            >
              <Icon className="h-3.5 w-3.5 text-emerald-700" />
              <span>{chip.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
