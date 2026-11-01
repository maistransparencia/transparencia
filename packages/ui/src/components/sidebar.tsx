"use client";

import {
  ChevronDown,
  FileText,
  Landmark,
  LayoutDashboard,
  PieChart,
  Pill,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../utils/cn";
import { buildNavUrl, buildTemasNavItems } from "../utils/nav";
import { MultiSelect, type MultiSelectOption } from "./multi-select";
import { ShareButton } from "./share-button";
import { ThemeToggle } from "./theme-toggle";

export interface NavGroup {
  label: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{
      className?: string;
      strokeWidth?: number | string;
    }>;
  }[];
}

export interface PrevidenciaNavConfig {
  habilitado: boolean;
  sigla: string;
  nome?: string;
}

export interface PortalOption {
  portalSlug: string;
  displayName: string;
  uf?: string;
  portalUrl?: string;
  brasaoAsset?: string;
  anoInicial?: number;
  dataExtracao?: string;
  previdencia?: PrevidenciaNavConfig;
}

export interface LinkComponentProps {
  href: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export type LinkComponent = ComponentType<LinkComponentProps>;

const DefaultLink: LinkComponent = ({ href, onClick, className, children }) => (
  <a href={href} onClick={onClick} className={className}>
    {children}
  </a>
);

export interface SidebarProps {
  linkComponent?: LinkComponent;
  currentPathname?: string | null;
  portalName?: string;
  stateUF?: string;
  portalTitle?: string;
  anoInicial?: number;
  entidades?: MultiSelectOption[];
  lastExtractionDate?: string;
  officialPortalUrl?: string;
  brasaoAsset?: string;
  selectedExercice?: string;
  onExerciceChange?: (year: string) => void;
  selectedEntidades?: string[];
  onEntidadesChange?: (selectedIds: string[]) => void;
  portalSlug?: string;
  portais?: PortalOption[];
  onPortalChange?: (portalSlug: string) => void;
  onOpenNewsletter?: () => void;
  mobileHeaderRightSlot?: React.ReactNode;
  mobileHeaderActionSlot?: React.ReactNode;
  mobileShareSlot?: React.ReactNode;
  desktopShareSlot?: React.ReactNode;
  onShare?: (payload: { method: "native" | "clipboard"; url: string }) => void;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  radarAlertCount?: number;
  previdencia?: PrevidenciaNavConfig;
}

function YearSelect({
  years,
  selectedYear,
  onChange,
  variant = "default",
}: {
  years: string[];
  selectedYear: string;
  onChange: (year: string) => void;
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="relative w-fit border-line border-b transition-colors focus-within:border-ink hover:border-mute3">
        <select
          id="exercice-select"
          aria-label="Selecionar Exercício"
          value={selectedYear}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[24px] w-full min-w-[50px] cursor-pointer appearance-none pr-4 pl-0 font-medium text-ink text-xs shadow-xs transition-colors focus:outline-none sm:min-h-0 sm:py-0.5 sm:text-xs"
        >
          {years.map((yr) => (
            <option
              key={yr}
              value={yr}
              className="bg-page py-2 font-medium text-base text-ink sm:text-sm"
            >
              {yr}
            </option>
          ))}
        </select>
        <ChevronDown
          strokeWidth={1.6}
          className="pointer-events-none absolute top-1/2 right-0.5 h-4 w-4 -translate-y-1/2 text-mute2"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <select
        id="exercice-select"
        value={selectedYear}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] w-full cursor-pointer appearance-none rounded-md border border-line bg-page px-3 py-2.5 font-medium text-ink text-sm shadow-xs transition-colors hover:border-mute3 focus:border-ink focus:outline-none sm:min-h-0 sm:py-2 sm:text-xs"
      >
        {years.map((yr) => (
          <option
            key={yr}
            value={yr}
            className="bg-page py-2 font-medium text-base text-ink sm:text-sm"
          >
            {yr}
          </option>
        ))}
      </select>
      <ChevronDown
        strokeWidth={1.6}
        className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-mute2"
      />
    </div>
  );
}

export function PortalSelect({
  portais,
  selectedSlug,
  onChange,
  variant = "default",
}: {
  portais: PortalOption[];
  selectedSlug: string;
  onChange: (slug: string) => void;
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="relative w-fit max-w-[200px] border-line border-b transition-colors focus-within:border-ink hover:border-mute3">
        <select
          id="portal-select-mobile"
          aria-label="Selecionar Município"
          value={selectedSlug}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[24px] w-full cursor-pointer appearance-none truncate pr-5 pl-0 font-bold font-serif text-ink text-xs shadow-xs transition-colors focus:outline-none sm:min-h-0 sm:py-0.5"
        >
          {portais.map((p) => (
            <option
              key={p.portalSlug}
              value={p.portalSlug}
              className="bg-page py-2 font-medium font-sans text-base text-ink sm:text-sm"
            >
              {p.displayName}
            </option>
          ))}
        </select>
        <ChevronDown
          strokeWidth={1.6}
          className="pointer-events-none absolute top-1/2 right-0.5 h-4 w-4 -translate-y-1/2 text-mute2"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <select
        id="portal-select-desktop"
        aria-label="Selecionar Município"
        value={selectedSlug}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] w-full cursor-pointer appearance-none rounded-md border border-line bg-page py-1.5 pr-8 pl-2.5 font-bold font-serif text-ink text-sm shadow-xs transition-colors hover:border-mute3 focus:border-ink focus:outline-none"
      >
        {portais.map((p) => (
          <option
            key={p.portalSlug}
            value={p.portalSlug}
            className="bg-page py-2 font-medium font-sans text-base text-ink sm:text-sm"
          >
            {p.displayName}
          </option>
        ))}
      </select>
      <ChevronDown
        strokeWidth={1.6}
        className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-mute2"
      />
    </div>
  );
}

export function Sidebar({
  portalName,
  stateUF,
  portalTitle,
  anoInicial,
  entidades = [],
  brasaoAsset,
  selectedExercice,
  onExerciceChange,
  selectedEntidades,
  onEntidadesChange,
  portalSlug,
  portais,
  onPortalChange,
  mobileHeaderRightSlot,
  mobileHeaderActionSlot,
  mobileShareSlot,
  desktopShareSlot,
  onShare,
  isMobileOpen: controlledMobileOpen,
  onMobileOpenChange,
  radarAlertCount,
  previdencia,
  linkComponent: Link = DefaultLink,
  currentPathname: pathname,
}: SidebarProps) {
  const currentYear = new Date().getFullYear();
  const [internalExercice, setInternalExercice] = useState(String(currentYear));
  const [internalEntidades, setInternalEntidades] = useState<string[]>([]);
  const [imgError, setImgError] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  const isMobileOpen = controlledMobileOpen ?? internalMobileOpen;
  const backdropMountedAt = useRef(0);

  useEffect(() => {
    if (!isMobileOpen) return;
    backdropMountedAt.current = Date.now();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileOpen]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Protege contra "ghost click" / tap bleed-through em dispositivos móveis touch
    if (Date.now() - backdropMountedAt.current < 350) {
      return;
    }
    setIsMobileOpen(false);
  };

  const setIsMobileOpen = (
    openOrUpdater: boolean | ((previousState: boolean) => boolean),
  ) => {
    const nextVal =
      typeof openOrUpdater === "function"
        ? openOrUpdater(isMobileOpen)
        : openOrUpdater;
    setInternalMobileOpen(nextVal);
    onMobileOpenChange?.(nextVal);
  };

  const currentExercice = selectedExercice ?? internalExercice;
  const handleExerciceChange = (val: string) => {
    setInternalExercice(val);
    onExerciceChange?.(val);
  };

  const currentEntidades = selectedEntidades ?? internalEntidades;
  const handleEntidadesChange = (ids: string[]) => {
    setInternalEntidades(ids);
    onEntidadesChange?.(ids);
  };

  const displayTitle = portalTitle || `Contas da ${portalName}`;

  // Gerar anos dinâmicos do ano atual até anoInicial
  const maxYear = currentYear;
  const minYear = anoInicial ?? 2021;
  const years = Array.from(
    { length: Math.max(1, maxYear - minYear + 1) },
    (_, i) => String(maxYear - i),
  );

  const normalizedBrasao = (() => {
    if (!brasaoAsset) return null;
    return brasaoAsset.startsWith("/") ? brasaoAsset : `/${brasaoAsset}`;
  })();

  const visaoGeralHref = buildNavUrl({
    path: "/",
    slug: portalSlug,
    exercice: currentExercice,
    entidades: currentEntidades,
  });
  const isVisaoGeralActive =
    pathname === "/" ||
    pathname === `/${portalSlug}` ||
    pathname === `/${portalSlug}/`;

  const radarTargetPath = portalSlug ? `/${portalSlug}/radar` : "/radar";
  const isRadarActive =
    pathname === "/radar" ||
    pathname === radarTargetPath ||
    (pathname
      ? pathname.startsWith(radarTargetPath) || pathname.startsWith("/radar")
      : false);
  const radarHref = buildNavUrl({
    path: "/radar",
    slug: portalSlug,
    exercice: currentExercice,
    entidades: currentEntidades,
  });

  const farmaciaTargetPath = portalSlug
    ? `/${portalSlug}/farmacia`
    : "/farmacia";
  const isFarmaciaActive = pathname
    ? pathname === farmaciaTargetPath ||
      pathname.startsWith(`${farmaciaTargetPath}/`)
    : false;
  const farmaciaHref = buildNavUrl({
    path: "/farmacia",
    slug: portalSlug,
    exercice: currentExercice,
    entidades: currentEntidades,
  });

  const temasItems = buildTemasNavItems({ previdencia }).map((tema) => ({
    name: tema.name,
    href: tema.href,
    icon: tema.icon,
  }));

  const navGroups: NavGroup[] = [
    {
      label: "Temas",
      items: temasItems,
    },
    {
      label: "Administrativo",
      items: [
        { name: "Receitas", href: "/receitas", icon: TrendingUp },
        { name: "Execução Orçamentária", href: "/orcamento", icon: PieChart },
        { name: "Despesas Detalhadas", href: "/despesas", icon: Receipt },
        { name: "Licitações e Contratos", href: "/licitacoes", icon: FileText },
        { name: "Pessoal", href: "/pessoal", icon: Users },
      ],
    },
  ];

  return (
    <>
      {/* Top Header Móvel (< md) */}
      <div
        data-cabecalho-movel
        className="sticky top-0 z-30 w-full border-line border-b bg-page px-4 py-2 shadow-xs md:hidden"
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line p-0.5">
              {!imgError && normalizedBrasao ? (
                <img
                  src={normalizedBrasao}
                  alt={`Brasão de ${portalName}`}
                  className="h-full w-full object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <Landmark strokeWidth={1.6} className="h-4 w-4 text-mute" />
              )}
            </div>
            {portais && portais.length > 0 && onPortalChange ? (
              <PortalSelect
                portais={portais}
                selectedSlug={portalSlug || (portais[0]?.portalSlug ?? "")}
                onChange={onPortalChange}
                variant="compact"
              />
            ) : (
              <span className="truncate font-bold font-serif text-ink text-sm leading-none">
                {displayTitle}
              </span>
            )}
          </div>

          {mobileHeaderActionSlot && (
            <div className="shrink-0">{mobileHeaderActionSlot}</div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-line border-t pt-1.5 text-mute text-xs">
          <div className="flex items-center gap-3">
            <YearSelect
              years={years}
              selectedYear={currentExercice}
              onChange={handleExerciceChange}
              variant="compact"
            />
            {mobileHeaderRightSlot}
          </div>
          <div className="shrink-0">
            {mobileShareSlot ?? (
              <ShareButton variant="compact" onShare={onShare} />
            )}
          </div>
        </div>
      </div>

      {/* Backdrop Móvel (< md) com Transição Suave */}
      <div
        role="presentation"
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out motion-reduce:transition-none md:hidden",
          isMobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={handleBackdropClick}
      />

      {/* Conteúdo da Sidebar (Desktop + Drawer Móvel com Animação de Slide) */}
      <aside
        className={cn(
          "select-none border-line border-r bg-page md:bg-transparent",
          "fixed inset-y-0 left-0 z-60 flex w-72 flex-col justify-between transition-[transform,visibility] duration-300 ease-in-out motion-reduce:transition-none",
          "md:sticky md:top-0 md:z-auto md:flex md:h-screen md:w-[266px] md:shrink-0 md:translate-x-0 md:shadow-none md:transition-none",
          isMobileOpen
            ? "pointer-events-auto visible translate-x-0 shadow-2xl"
            : "pointer-events-none invisible -translate-x-full shadow-none md:pointer-events-auto md:visible",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Marca Superior / Brasão Municipal */}
          <div className="border-line border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line p-1">
                  {!imgError && normalizedBrasao ? (
                    <img
                      src={normalizedBrasao}
                      alt={`Brasão de ${portalName}`}
                      className="h-full w-full object-contain"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <Landmark strokeWidth={1.6} className="h-5 w-5 text-mute" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {portais && portais.length > 0 && onPortalChange ? (
                    <div className="space-y-1 md:space-y-0.5">
                      <h1 className="sr-only">{displayTitle}</h1>
                      <PortalSelect
                        portais={portais}
                        selectedSlug={
                          portalSlug || (portais[0]?.portalSlug ?? "")
                        }
                        onChange={onPortalChange}
                        variant="compact"
                      />
                      <p className="text-[11px] text-mute2">
                        Orçamento municipal · {stateUF}
                      </p>
                    </div>
                  ) : (
                    <>
                      <h1 className="font-bold font-serif text-base text-ink leading-tight">
                        {displayTitle}
                      </h1>
                      <p className="text-[11px] text-mute2">
                        Orçamento municipal · {stateUF}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-page text-mute2 transition-colors hover:text-ink md:hidden"
                aria-label="Fechar menu"
              >
                <X strokeWidth={2} className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Seção de Filtros */}
          <div className="space-y-2.5 border-line border-b px-4 py-3.5">
            <p className="font-semibold text-[11px] text-mute2">Filtros</p>
            <div className="space-y-2">
              <div>
                <label
                  htmlFor="exercice-select"
                  className="mb-1 block font-medium text-[11px] text-mute"
                >
                  Exercício
                </label>
                <YearSelect
                  years={years}
                  selectedYear={currentExercice}
                  onChange={handleExerciceChange}
                />
              </div>
              <div>
                <span className="mb-1 block font-medium text-[11px] text-mute">
                  Entidade
                </span>
                <MultiSelect
                  options={entidades}
                  selectedIds={currentEntidades}
                  onChange={handleEntidadesChange}
                />
              </div>
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="space-y-3 p-4">
            {/* Opções principais isoladas no topo sem cabeçalho de grupo */}
            <div className="space-y-2">
              <Link
                href={visaoGeralHref}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2.5 border-l-2 px-3 py-2.5 font-medium text-xs transition-colors sm:min-h-0 md:py-1.5",
                  isVisaoGeralActive
                    ? "border-ink font-semibold text-ink"
                    : "border-transparent text-mute hover:text-ink",
                )}
              >
                <LayoutDashboard
                  strokeWidth={1.6}
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isVisaoGeralActive ? "text-ink" : "text-mute2",
                  )}
                />
                <span>Visão geral</span>
              </Link>

              <Link
                href={radarHref}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center justify-between gap-2 border-l-2 px-3 py-2.5 font-medium text-xs transition-colors sm:min-h-0 md:py-1.5",
                  isRadarActive
                    ? "border-ink font-semibold text-ink"
                    : "border-transparent text-mute hover:text-ink",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <ShieldAlert
                    strokeWidth={1.6}
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isRadarActive ? "text-ink" : "text-mute2",
                    )}
                  />
                  <span className="truncate">Radar Cívico</span>
                </div>
                {typeof radarAlertCount === "number" && radarAlertCount > 0 && (
                  <span
                    role="status"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger-text bg-page px-2 py-0.5 font-semibold text-[11px] text-danger-text"
                    aria-label={`${radarAlertCount} alertas críticos apurados`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-danger-fill motion-safe:animate-pulse motion-reduce:animate-none"
                    />
                    <span className="tabular-nums">{radarAlertCount}</span>
                  </span>
                )}
              </Link>

              <Link
                href={farmaciaHref}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2.5 border-l-2 px-3 py-2.5 font-medium text-xs transition-colors sm:min-h-0 md:py-1.5",
                  isFarmaciaActive
                    ? "border-ink font-semibold text-ink"
                    : "border-transparent text-mute hover:text-ink",
                )}
              >
                <Pill
                  strokeWidth={1.6}
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isFarmaciaActive ? "text-ink" : "text-mute2",
                  )}
                />
                <span>Farmácia SUS</span>
              </Link>
            </div>

            {/* Demais Grupos de Navegação */}
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="mb-1.5 px-3 font-semibold text-[11px] text-mute2">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const targetPath = portalSlug
                    ? `/${portalSlug}${item.href}`
                    : item.href;
                  const isPrevidenciaItem = item.href === "/previdencia";
                  const isActive =
                    pathname === item.href ||
                    pathname === targetPath ||
                    (pathname
                      ? pathname.startsWith(targetPath) ||
                        pathname.startsWith(item.href) ||
                        (isPrevidenciaItem &&
                          (pathname === "/caprem" ||
                            pathname.startsWith("/caprem") ||
                            Boolean(
                              portalSlug &&
                                (pathname === `/${portalSlug}/caprem` ||
                                  pathname.startsWith(`/${portalSlug}/caprem`)),
                            )))
                      : false);
                  const itemHref = buildNavUrl({
                    path: item.href,
                    slug: portalSlug,
                    exercice: currentExercice,
                    entidades: currentEntidades,
                  });
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={itemHref}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex min-h-[44px] items-center justify-between gap-2 border-l-2 px-3 py-2.5 font-medium text-xs transition-colors sm:min-h-0 md:py-1.5",
                        isActive
                          ? "border-ink font-semibold text-ink"
                          : "border-transparent text-mute hover:text-ink",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Icon
                          strokeWidth={1.6}
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-ink" : "text-mute2",
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Rodapé: compartilhar e alternador de tema */}
        <div className="space-y-2 border-line border-t p-4 md:p-3">
          <div className="hidden md:block">
            {desktopShareSlot ?? (
              <ShareButton variant="sidebar" onShare={onShare} />
            )}
          </div>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
