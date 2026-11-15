import { cn, fmtCompact } from "@transparencia/ui";

export interface PrevistoVsArrecadadoOrigemItem {
  categoria: string;
  valorArrecadado: number;
  percentualDoTotal: number;
}

const ROTULOS_ORIGEM: Record<string, string> = {
  previdencia_servidores: "Contribuição à previdência dos servidores",
  previdencia_geral_inss: "Contribuição ao INSS",
  imposto_renda_retido: "Imposto de renda retido",
  plano_saude_servidores: "Planos de saúde dos servidores",
  emprestimo_consignado: "Parcelas de empréstimos consignados",
  iss_retido: "ISS retido de prestadores de serviço",
  pensao_alimenticia: "Pensão alimentícia",
  regularizacao_conciliacao: "Acertos contábeis entre contas (regularizações)",
  outros_descontos: "Outros descontos e retenções",
};

export interface PrevistoVsArrecadadoItem {
  fonte: string;
  previsto: number;
  arrecadado: number;
  pctRealizado: number;
  semPrevisao?: boolean;
  origem?: PrevistoVsArrecadadoOrigemItem[];
  previstoFormatted?: string;
  arrecadadoFormatted?: string;
}

export interface PrevistoVsArrecadadoProps {
  items: PrevistoVsArrecadadoItem[];
  maxVal?: number;
}

export function PrevistoVsArrecadadoOrigem({
  items,
  maxVal,
}: PrevistoVsArrecadadoProps) {
  // A régua de R$ é definida pelo maior valor (previsto ou arrecadado) entre todas as origens
  const maxScale =
    maxVal ||
    Math.max(...items.flatMap((item) => [item.previsto, item.arrecadado]), 1);

  return (
    <div className="space-y-5">
      {items.map((item) => {
        // O comprimento da trilha representa o previsto (ou arrecadado se superado), com piso mínimo de 18% para manter legibilidade visual
        const baseVal = Math.max(item.previsto, item.arrecadado);
        const trackWidthPct = Math.min(
          100,
          Math.max(18, (baseVal / maxScale) * 100),
        );

        // Preenchimento interno = proporção arrecadada em relação ao previsto
        const fillPct =
          item.previsto > 0
            ? Math.min(
                100,
                Math.max(0, (item.arrecadado / item.previsto) * 100),
              )
            : 0;

        const falta = Math.max(0, item.previsto - item.arrecadado);
        const faltaText = falta > 0 ? ` · restam ${fmtCompact(falta)}` : "";

        const isPropria =
          item.fonte.toLowerCase().includes("própria") ||
          item.fonte.toLowerCase().includes("propria");

        const barColorClass = isPropria ? "bg-ok-fill" : "bg-brand-fill";

        return (
          <div key={`previsto-vs-arrecadado-${item.fonte}`}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-ink font-semibold">{item.fonte}</span>
              <span className="caption font-medium">
                {fmtCompact(item.arrecadado)} / {fmtCompact(item.previsto)}
              </span>
            </div>

            <div className="w-full">
              <div
                className="bg-track h-5 overflow-hidden"
                style={{ width: `${trackWidthPct}%` }}
              >
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    barColorClass,
                  )}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>

            <div className="caption mt-1 font-medium">
              {item.semPrevisao
                ? "Dinheiro que a prefeitura retém do salário dos servidores e de pagamentos a fornecedores (como contribuição à previdência, imposto de renda e parcelas de empréstimo) e repassa a quem de direito. Passa pelo caixa, mas em regra não é dinheiro da prefeitura."
                : `${Math.round(item.pctRealizado)}% do previsto já arrecadado${faltaText}`}
            </div>

            {item.origem && item.origem.length > 0 ? (
              <details className="mt-2">
                <summary className="text-brand-text cursor-pointer text-sm font-semibold">
                  De onde vem este valor
                </summary>
                <p className="caption mt-2">
                  Classificação aproximada, feita a partir da descrição de cada
                  lançamento no portal da prefeitura.
                </p>
                <ul className="mt-2 space-y-3">
                  {item.origem.map((origem) => (
                    <li key={`origem-${origem.categoria}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {ROTULOS_ORIGEM[origem.categoria] ??
                            ROTULOS_ORIGEM.outros_descontos}
                        </span>
                        <span className="numeric">
                          {fmtCompact(origem.valorArrecadado)} ·{" "}
                          {origem.percentualDoTotal
                            .toFixed(1)
                            .replace(".", ",")}
                          %
                        </span>
                      </div>
                      <div className="bg-track mt-1 h-2 w-full">
                        <div
                          className="bg-brand-fill h-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, origem.percentualDoTotal))}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
