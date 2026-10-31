import type { FontesReceitaSaudeDTO } from "@transparencia/db";
import { cn, fmtCompact, Indicator, IndicatorPanel } from "@transparencia/ui";

export interface SaudeOrigemRecursosProps {
  fontes: FontesReceitaSaudeDTO;
  ano: number;
  className?: string;
}

interface OrigemRecurso {
  chave: string;
  nome: string;
  valor: number;
  percentual: number;
  corClasse: string;
}

export function SaudeOrigemRecursos({
  fontes,
  ano,
  className,
}: SaudeOrigemRecursosProps) {
  if (fontes.totalEntrada <= 0) {
    return (
      <p className={cn("border-line border-y py-4 text-mute", className)}>
        Sem lançamentos de receita do Fundo em {ano}.
      </p>
    );
  }

  const origens: OrigemRecurso[] = [
    {
      chave: "uniao",
      nome: "Transferências da União (SUS)",
      valor: fontes.receitaUniao,
      percentual: fontes.percentualUniaoSus,
      corClasse: "bg-brand-fill",
    },
    {
      chave: "estado",
      nome: "Transferências do Estado",
      valor: fontes.receitaEstado,
      percentual: fontes.percentualEstado,
      corClasse: "bg-ok-fill",
    },
    {
      chave: "prefeitura",
      nome: "Repasses da Prefeitura",
      valor: fontes.repassesPrefeitura,
      percentual: fontes.percentualPropria,
      corClasse: "bg-ink",
    },
    {
      chave: "outras",
      nome: "Outras receitas do Fundo",
      valor: fontes.receitaOutras,
      percentual: fontes.percentualOutrasReceitas,
      corClasse: "bg-warn-fill",
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <div
        className="flex h-3 w-full gap-0.5 overflow-hidden bg-track"
        role="img"
        aria-label={origens
          .map((origem) => `${origem.nome} ${origem.percentual}%`)
          .join(", ")}
      >
        {origens.map((origem) => (
          <span
            key={origem.chave}
            className={cn("block h-full", origem.corClasse)}
            style={{
              width: `${Math.min(100, Math.max(0, origem.percentual))}%`,
            }}
          />
        ))}
      </div>

      <IndicatorPanel columns={4} size="sm">
        {origens.map((origem) => (
          <Indicator
            key={origem.chave}
            label={
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("inline-block h-2.5 w-2.5", origem.corClasse)}
                />
                {origem.nome}
              </span>
            }
            value={fmtCompact(origem.valor)}
            note={`${origem.percentual}% do que entrou`}
          />
        ))}
      </IndicatorPanel>
    </div>
  );
}
