import { ArrowRight } from "lucide-react";
import Link from "next/link";

export interface FornecedorDocumentoDetalheProps {
  documento: string | null;
  portalSlug: string;
  ano: number;
}

/** Documento só é exibido como vem da fonte; 11 dígitos sem máscara nunca são renderizados. */
const CPF_SEM_MASCARA = /(?<!\d)(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})(?!\d)/;

const documentoExibivel = (documento: string | null) =>
  documento && !CPF_SEM_MASCARA.test(documento) ? documento : null;

/** Só CNPJ completo vira busca; CPF (mascarado ou não) nunca é usado. */
const cnpjParaBusca = (documento: string | null) => {
  const digitos = documento?.replace(/\D/g, "") ?? "";
  return digitos.length === 14 ? digitos : null;
};

export function FornecedorDocumentoDetalhe({
  documento,
  portalSlug,
  ano,
}: FornecedorDocumentoDetalheProps) {
  const exibivel = documentoExibivel(documento);
  const cnpj = cnpjParaBusca(exibivel);

  return (
    <div className="space-y-1.5 pb-4 text-mute text-sm">
      <p>{exibivel ? `Documento: ${exibivel}` : "Documento não informado"}</p>
      {cnpj && (
        <Link
          href={`/${portalSlug}/licitacoes?ano=${ano}&q=${cnpj}`}
          className="inline-flex items-center gap-1 font-medium text-ink underline underline-offset-2 hover:text-brand"
        >
          Ver licitações e contratos
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
