export interface RibbonProps {
  portalName?: string;
}

export function Ribbon({ portalName }: RibbonProps) {
  return (
    <div className="flex items-center gap-2 border-line border-b bg-banbg px-4 py-2.5 text-[11.5px] text-banfg sm:px-6 md:px-10">
      <span className="h-1.5 w-1.5 shrink-0 rounded-md bg-brand" />
      <span>
        Iniciativa{" "}
        <strong className="font-semibold">livre e apartidária</strong>, sem
        vínculo com a administração municipal. Dados extraídos do Portal da
        Transparência oficial da {portalName}.
      </span>
    </div>
  );
}
