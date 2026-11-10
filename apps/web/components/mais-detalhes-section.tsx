import Link from "next/link";
import { SectionWithHeader } from "./section-with-header";

export interface DetailShortcut {
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
      <ul>
        {shortcuts.map((shortcut) => (
          <li key={shortcut.url}>
            <Link href={shortcut.url}>{shortcut.title}</Link>
          </li>
        ))}
      </ul>
    </SectionWithHeader>
  );
}
