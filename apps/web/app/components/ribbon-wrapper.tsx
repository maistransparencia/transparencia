"use client";

import {
  type PortalOption,
  Ribbon,
  resolvePortalSlug,
} from "@transparencia/ui";
import { usePathname } from "next/navigation";

export interface RibbonWrapperProps {
  portalName?: string;
  portais?: PortalOption[];
}

export function RibbonWrapper({
  portalName = "Prefeitura",
  portais,
}: RibbonWrapperProps) {
  const pathname = usePathname();
  const segments = (pathname || "").split("/").filter(Boolean);
  const activePortal = (() => {
    if (segments.length > 0) {
      const first = segments[0];
      return portais?.find(
        (p) =>
          p.portalSlug === first || p.portalSlug === resolvePortalSlug(first),
      );
    }
    return undefined;
  })();

  const effectivePortalName = activePortal?.displayName || portalName;

  return <Ribbon portalName={effectivePortalName} />;
}
