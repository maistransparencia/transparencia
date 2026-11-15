import type { FonteEmendaDTO } from "@transparencia/db";
import { fmtDate } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";

const ROTULO_ESFERA: Record<FonteEmendaDTO["esfera"], string> = {
  estadual: "Governo estadual",
  federal: "Governo federal",
  municipal: "Prefeitura",
};

interface GrupoFonte {
  chave: string;
  esfera: FonteEmendaDTO["esfera"];
  orgao: string;
  url: string;
  uso: string;
  arquivos: FonteEmendaDTO[];
}

/** Junta os arquivos do mesmo órgão e da mesma página para o órgão aparecer uma vez só. */
function agruparFontes(fontes: FonteEmendaDTO[]): GrupoFonte[] {
  const grupos = new Map<string, GrupoFonte>();
  fontes.forEach((fonte) => {
    const chave = `${fonte.esfera}|${fonte.orgao}|${fonte.url}`;
    const grupo = grupos.get(chave) ?? {
      chave,
      esfera: fonte.esfera,
      orgao: fonte.orgao,
      url: fonte.url,
      uso: fonte.uso,
      arquivos: [],
    };
    grupo.arquivos.push(fonte);
    grupos.set(chave, grupo);
  });
  return [...grupos.values()];
}

function descreverArquivo(fonte: FonteEmendaDTO): string {
  return [
    fonte.nome,
    fonte.dataArquivo ? `arquivo de ${fmtDate(fonte.dataArquivo)}` : null,
    fonte.posicaoRelatorio
      ? `posição do relatório: ${fonte.posicaoRelatorio}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Origem dos registros de emenda: quem publica, o arquivo ou a página, a data e o link oficial. */
export function FontesEmendas({ fontes }: { fontes: FonteEmendaDTO[] }) {
  if (fontes.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="fontes-emendas">
      <h4>De onde vêm estes dados</h4>
      <ul className="space-y-2">
        {agruparFontes(fontes).map((grupo) => (
          <li key={grupo.chave} className="caption">
            <span className="eyebrow">
              {ROTULO_ESFERA[grupo.esfera]} · {grupo.uso}
            </span>
            <span className="block">
              {grupo.orgao}. {grupo.arquivos.map(descreverArquivo).join("; ")}.{" "}
              <a href={grupo.url} target="_blank" rel="noopener noreferrer">
                Página oficial
                <ExternalLink aria-hidden className="ml-1 inline size-3" />
              </a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
