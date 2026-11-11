"use client";

import { Button } from "@transparencia/ui";
import { useRouter } from "next/navigation";

export interface SaudeFarmaciaBotaoProps {
  portalSlug: string;
}

/** Leva à busca da Farmácia SUS; o `Button` do design system é ação, então a navegação é feita pelo roteador. */
export function SaudeFarmaciaBotao({ portalSlug }: SaudeFarmaciaBotaoProps) {
  const router = useRouter();
  return (
    <Button
      variant="primary"
      onClick={() => router.push(`/${portalSlug}/farmacia`)}
    >
      Buscar remédio na Farmácia SUS
    </Button>
  );
}
