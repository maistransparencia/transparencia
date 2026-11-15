"use client";

import { ModalDialog } from "@transparencia/ui";
import { type ReactNode, useState } from "react";
import { VerDetalhesLink } from "@/components/educacao/ver-detalhes-link";

export interface SaudeDetalhesModalProps {
  /** Título do modal; também diz ao leitor de tela o que o link abre. */
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}

/** "Ver detalhes" da saúde: sempre um link que abre um modal, como na educação. */
export function SaudeDetalhesModal({
  titulo,
  subtitulo,
  children,
  footer,
  testId,
}: SaudeDetalhesModalProps) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <VerDetalhesLink
        onClick={() => setAberto(true)}
        context={titulo}
        testId={testId}
      />
      <ModalDialog
        isOpen={aberto}
        onClose={() => setAberto(false)}
        title={titulo}
        subtitle={subtitulo}
        maxWidth="2xl"
        showShareButton={false}
        footer={footer}
      >
        {children}
      </ModalDialog>
    </>
  );
}
