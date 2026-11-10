import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { SectionWithHeader } from "./section-with-header";

export interface DetailShortcut {
  label: string;
  title: string;
  url: string;
}

export interface MaisDetalhesSectionProps {
  shortcuts: DetailShortcut[];
}

/** Shortcuts para as páginas de detalhe; os números ficam nas próprias páginas. */
export function MaisDetalhesSection({ shortcuts }: MaisDetalhesSectionProps) {
  return (
    <SectionWithHeader id="mais-detalhes" title="Mais detalhes">
      <ul className="grid md:grid-cols-3 md:gap-x-8">
        {shortcuts.map((shortcut) => (
          <li
            key={shortcut.url}
            className="border-line border-b first:border-t md:border-t"
          >
            <Link
              href={shortcut.url}
              className="group flex min-h-16 items-center justify-between gap-3 py-3 text-ink no-underline"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold group-hover:text-brand group-hover:underline">
                  {shortcut.label}
                </span>
                <span className="caption">{shortcut.title}</span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-mute"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </SectionWithHeader>
  );
}
