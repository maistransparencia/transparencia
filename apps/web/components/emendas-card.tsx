import { cn, fmtCompact } from "@transparencia/ui";

export interface EmendasCardProps {
  totalEmendas: number;
  pctDoArrecadado: number;
  emendasPix: number;
  emendasIndividuais: number;
  emendasTotalEmpenhado: number;
  className?: string;
}

interface LinhaEmendaProps {
  rotulo: string;
  valor: number;
  percentual: number;
  corBarra: string;
}

function LinhaEmenda({
  rotulo,
  valor,
  percentual,
  corBarra,
}: LinhaEmendaProps) {
  return (
    <div className="space-y-1.5">
      <p className="font-medium text-ink text-sm">{rotulo}</p>
      <div className="h-2 w-full overflow-hidden bg-track">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            corBarra,
          )}
          style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }}
        />
      </div>
      <p className="caption">
        <span className="numeric font-semibold text-ink">
          {fmtCompact(valor)}
        </span>{" "}
        · {percentual.toFixed(1).replace(".", ",")}% do total de emendas
      </p>
    </div>
  );
}

export function EmendasCard({
  totalEmendas,
  emendasPix,
  emendasIndividuais,
  emendasTotalEmpenhado,
  className,
}: EmendasCardProps) {
  const percentualPix =
    totalEmendas > 0 ? (emendasPix / totalEmendas) * 100 : 0;
  const percentualIndividuais =
    totalEmendas > 0 ? (emendasIndividuais / totalEmendas) * 100 : 0;

  return (
    <section
      className={cn(
        "panel panel-brand border! grid grid-cols-1 items-start gap-6 rounded-md! p-6! lg:grid-cols-12 lg:gap-0",
        className,
      )}
    >
      <div className="space-y-3 lg:col-span-6 lg:pr-6">
        <p className="eyebrow">Recebido por emendas parlamentares</p>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="stat-value">{fmtCompact(totalEmendas)}</span>
          <span className="caption font-medium">
            recebidos. Já reservados (empenhados) para gastos:
          </span>
          <span className="font-semibold text-base text-mute2">
            {fmtCompact(emendasTotalEmpenhado)}
          </span>
        </div>

        <p className="text-mute text-xs leading-relaxed">
          Dinheiro enviado por deputados e senadores para obras e serviços do
          município. É diferente dos repasses que chegam todo mês por lei (FPM e
          ICMS).
        </p>
      </div>

      <div className="space-y-4 lg:col-span-6 lg:border-line lg:border-l lg:pl-6">
        <LinhaEmenda
          rotulo="Emendas individuais ou de bancada"
          valor={emendasIndividuais}
          percentual={percentualIndividuais}
          corBarra="bg-brand-fill"
        />
        <LinhaEmenda
          rotulo="Emendas Pix (transferências especiais, sem destino fixado)"
          valor={emendasPix}
          percentual={percentualPix}
          corBarra="bg-ok-fill"
        />
      </div>
    </section>
  );
}
