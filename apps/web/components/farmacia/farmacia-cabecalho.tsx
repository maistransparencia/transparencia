import { FarmaciaBuscaDestaque } from "./farmacia-busca-destaque";
import { FarmaciaSeloTransparencia } from "./farmacia-selo-transparencia";

export interface FarmaciaCabecalhoProps {
  /** Só o estado `conforme` exibe selo de atualização e busca. */
  conforme: boolean;
  dataAtualizacao: string | null;
  action: string;
  busca: string;
  exemplos: { nomePrincipioAtivo: string; href: string }[];
}

export function FarmaciaCabecalho({
  conforme,
  dataAtualizacao,
  action,
  busca,
  exemplos,
}: FarmaciaCabecalhoProps) {
  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1>Farmácia SUS</h1>
          <p className="text-[15px] text-mute leading-relaxed">
            Consulte em qual unidade de saúde do município o remédio está
            disponível.
          </p>
        </div>
        {conforme && (
          <FarmaciaSeloTransparencia dataAtualizacao={dataAtualizacao} />
        )}
      </div>
      {conforme && (
        <FarmaciaBuscaDestaque
          key={busca}
          action={action}
          defaultValue={busca}
          exemplos={exemplos}
        />
      )}
    </header>
  );
}
