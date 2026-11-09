"use client";

import type { EducacaoContratoDTO } from "@transparencia/db";
import { ModalDialog } from "@transparencia/ui";
import { useMemo } from "react";
import { type LeiLinkProps, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { ContratosTabela } from "./contratos-tabela";

export const LIMITE_CONTRATOS_PARA_BUSCA = 8;

export interface ContratosCategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoriaLabel: string;
  contratos: EducacaoContratoDTO[];
  /** Leis que fundamentam a categoria, no rodapé. */
  laws?: LeiLinkProps[];
  onSelectContrato: (contrato: EducacaoContratoDTO) => void;
}

export function ContratosCategoriaModal({
  isOpen,
  onClose,
  categoriaLabel,
  contratos,
  laws = [],
  onSelectContrato,
}: ContratosCategoriaModalProps) {
  const contratosOrdenados = useMemo(
    () => [...contratos].sort((a, b) => b.valorContrato - a.valorContrato),
    [contratos],
  );
  const rotuloQuantidade = `${contratos.length} ${contratos.length === 1 ? "contrato" : "contratos"} nesta categoria`;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={categoriaLabel}
      maxWidth="4xl"
      zIndex="z-50"
      showShareButton={false}
      footer={
        <div className="space-y-1">
          <p className="caption">{rotuloQuantidade}</p>
          <LinhaLeiEFonte
            source="contratos do Fundo Municipal de Educação"
            laws={laws}
          />
        </div>
      }
    >
      <ContratosTabela
        contratos={contratosOrdenados}
        onOpenContrato={onSelectContrato}
        exportFilename="contratos_educacao_categoria.csv"
        hideSearch={contratos.length <= LIMITE_CONTRATOS_PARA_BUSCA}
      />
    </ModalDialog>
  );
}
