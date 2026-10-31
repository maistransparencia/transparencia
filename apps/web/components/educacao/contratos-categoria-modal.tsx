"use client";

import type { EducacaoContratoDTO } from "@transparencia/db";
import { fmtCurrency, ModalDialog } from "@transparencia/ui";
import { useMemo } from "react";
import { ContratosTabela } from "./contratos-tabela";

export const LIMITE_CONTRATOS_PARA_BUSCA = 8;

export interface ContratosCategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoriaLabel: string;
  contratos: EducacaoContratoDTO[];
  valorTotal: number;
  onSelectContrato: (contrato: EducacaoContratoDTO) => void;
}

export function ContratosCategoriaModal({
  isOpen,
  onClose,
  categoriaLabel,
  contratos,
  valorTotal,
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
      subtitle={fmtCurrency(valorTotal)}
      maxWidth="4xl"
      zIndex="z-50"
      showShareButton={false}
      footer={<p className="caption">{rotuloQuantidade}</p>}
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
