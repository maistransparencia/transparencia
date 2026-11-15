"use client";

import {
  ChevronDown,
  FileText,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
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
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";
import { buildNavUrl, buildTemasNavItems } from "../utils/nav";
import { BrandLogo } from "./brand-logo";
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
  anoInicial?: number;
  dataExtracao?: string;
  previdencia?: PrevidenciaNavConfig;
}

export interface LinkComponentProps {
  href: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  title?: string;
  "aria-label"?: string;
}

export type LinkComponent = ComponentType<LinkComponentProps>;

const DefaultLink: LinkComponent = ({
  href,
  onClick,
  className,
  children,
  title,
  "aria-label": ariaLabel,
}) => (
  <a
    href={href}
    onClick={onClick}
    className={className}
    title={title}
    aria-label={ariaLabel}
  >
    {children}
  </a>
);

export interface SidebarProps {
  linkComponent?: LinkComponent;
  currentPathname?: string | null;
  portalName?: string;
  portalTitle?: string;
  anoInicial?: number;
  entidades?: MultiSelectOption[];
  lastExtractionDate?: string;
  officialPortalUrl?: string;
  selectedExercice?: string;
  onExerciceChange?: (year: string) => void;
  selectedEntidades?: string[];
  onEntidadesChange?: (selectedIds: string[]) => void;
  portalSlug?: string;
  portais?: PortalOption[];
  onPortalChange?: (portalSlug: string) => void;
  onOpenNewsletter?: () => void;
  brandName?: string;
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

const cityNamePrefix = /^Prefeitura( Municipal)? (de|do|da|dos|das)\s+/i;

function toCityLabel({ displayName, uf }: PortalOption) {
  const cityName = displayName.replace(cityNamePrefix, "");
  return uf ? `${cityName} · ${uf}` : cityName;
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
      <div className="border-line focus-within:border-ink hover:border-mute3 relative w-fit border-b transition-colors">
        <select
          id="exercice-select"
          aria-label="Selecionar Exercício"
          value={selectedYear}
          onChange={(e) => onChange(e.target.value)}
          className="text-ink min-h-[24px] w-full min-w-[50px] cursor-pointer appearance-none pr-4 pl-0 text-xs font-medium shadow-xs transition-colors focus:outline-none sm:min-h-0 sm:py-0.5 sm:text-xs"
        >
          {years.map((yr) => (
            <option
              key={yr}
              value={yr}
              className="bg-page text-ink py-2 text-base font-medium sm:text-sm"
            >
              {yr}
            </option>
          ))}
        </select>
        <ChevronDown
          strokeWidth={1.6}
          className="text-mute2 pointer-events-none absolute top-1/2 right-0.5 h-4 w-4 -translate-y-1/2"
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
        className="border-line bg-page text-ink hover:border-mute3 focus:border-ink min-h-[44px] w-full cursor-pointer appearance-none rounded-md border px-2.5 py-2 pr-8 text-xs font-medium transition-colors focus:outline-none sm:min-h-0"
      >
        {years.map((yr) => (
          <option
            key={yr}
            value={yr}
            className="bg-page text-ink py-2 text-base font-medium sm:text-sm"
          >
            {yr}
          </option>
        ))}
      </select>
      <ChevronDown
        strokeWidth={1.6}
        className="text-mute2 pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2"
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
      <div className="border-line focus-within:border-ink hover:border-mute3 relative w-fit max-w-[200px] border-b transition-colors">
        <select
          id="portal-select-mobile"
          aria-label="Selecionar Município"
          value={selectedSlug}
          onChange={(e) => onChange(e.target.value)}
          className="text-ink min-h-[24px] w-full cursor-pointer appearance-none truncate pr-5 pl-0 font-serif text-xs font-bold shadow-xs transition-colors focus:outline-none sm:min-h-0 sm:py-0.5"
        >
          {portais.map((p) => (
            <option
              key={p.portalSlug}
              value={p.portalSlug}
              className="bg-page text-ink py-2 font-sans text-base font-medium sm:text-sm"
            >
              {toCityLabel(p)}
            </option>
          ))}
        </select>
        <ChevronDown
          strokeWidth={1.6}
          className="text-mute2 pointer-events-none absolute top-1/2 right-0.5 h-4 w-4 -translate-y-1/2"
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
        className="border-line bg-page text-ink hover:border-mute3 focus:border-ink min-h-[44px] w-full cursor-pointer appearance-none rounded-md border py-1.5 pr-8 pl-2.5 font-serif text-sm font-bold shadow-xs transition-colors focus:outline-none"
      >
        {portais.map((p) => (
          <option
            key={p.portalSlug}
            value={p.portalSlug}
            className="bg-page text-ink py-2 font-sans text-base font-medium sm:text-sm"
          >
            {toCityLabel(p)}
          </option>
        ))}
      </select>
      <ChevronDown
        strokeWidth={1.6}
        className="text-mute2 pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2"
      />
    </div>
  );
}

export function Sidebar({
  portalName,
  portalTitle,
  anoInicial,
  entidades = [],
  selectedExercice,
  onExerciceChange,
  selectedEntidades,
  onEntidadesChange,
  portalSlug,
  portais,
  onPortalChange,
  brandName,
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
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  // Só no desktop e sem persistência: toda visita abre expandida.
  // `isNarrow` anima a largura; `isCollapsed` troca o layout para só ícones. Com o layout completo,
  // o conteúdo tem largura fixa e a sidebar o recorta: ao expandir, o layout completo entra logo e a
  // largura o revela deslizando; ao recolher, ele vai sendo coberto e só no fim vira só ícones.
  const [isNarrow, setIsNarrow] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const hideWhenCollapsed = isCollapsed ? "md:hidden" : "";
  const collapsedLinkClass = isCollapsed ? "md:justify-center md:px-0" : "";
  const collapsedLinkProps = (name: string) =>
    isCollapsed ? { "aria-label": name } : {};

  const toggleCollapsed = () => {
    setTooltip(null);
    if (isNarrow) {
      setIsCollapsed(false);
      setIsNarrow(false);
      return;
    }
    setIsNarrow(true);
  };

  useEffect(() => {
    if (!isNarrow || isCollapsed) return;
    const timer = window.setTimeout(() => setIsCollapsed(true), 200);
    return () => window.clearTimeout(timer);
  }, [isNarrow, isCollapsed]);

  // Tooltip do design system no lugar do `title` nativo: ícones do menu recolhido e o botão de
  // recolher. Vai para o body porque a área com rolagem cortaria o balão.
  const showTooltip = (
    event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>,
  ) => {
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const selector = isCollapsed
      ? "a[aria-label], [data-sidebar-tooltip]"
      : "[data-sidebar-tooltip]";
    const target = (event.target as HTMLElement).closest<HTMLElement>(selector);
    const text = target?.getAttribute("aria-label");
    if (!target || !text) {
      setTooltip(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    setTooltip({ text, top: rect.top + rect.height / 2, left: rect.right + 8 });
  };
  const hideTooltip = () => setTooltip(null);

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
        className="border-line bg-page sticky top-0 z-30 w-full border-b px-4 py-2 shadow-xs md:hidden"
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-ink flex min-w-0 items-center gap-2 font-serif text-sm leading-snug font-bold">
            <BrandLogo variant="header" className="h-6 w-6 shrink-0" />
            <span className="truncate">{brandName}</span>
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {mobileHeaderActionSlot}
            {mobileShareSlot ?? (
              <ShareButton variant="compact" onShare={onShare} />
            )}
          </div>
        </div>

        <div className="border-line text-mute mt-2 flex items-center gap-3 border-t pt-1.5 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            {portais && portais.length > 0 && onPortalChange ? (
              <PortalSelect
                portais={portais}
                selectedSlug={portalSlug || (portais[0]?.portalSlug ?? "")}
                onChange={onPortalChange}
                variant="compact"
              />
            ) : (
              <span className="text-ink truncate font-serif text-sm leading-none font-bold">
                {displayTitle}
              </span>
            )}
          </div>
          <span aria-hidden="true" className="bg-line h-4 w-px shrink-0" />
          <div className="flex items-center gap-3">
            <YearSelect
              years={years}
              selectedYear={currentExercice}
              onChange={handleExerciceChange}
              variant="compact"
            />
            {mobileHeaderRightSlot}
          </div>
        </div>
      </div>

      {/* Backdrop Móvel (< md) com Transição Suave */}
      <div
        role="presentation"
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out md:hidden",
          isMobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={handleBackdropClick}
      />

      {/* Conteúdo da Sidebar (Desktop + Drawer Móvel com Animação de Slide) */}
      <aside
        className={cn(
          "border-line bg-page border-r select-none md:bg-transparent",
          "fixed inset-y-0 left-0 z-60 flex w-72 flex-col justify-between transition-[translate,visibility] duration-300 ease-in-out",
          "md:sticky md:top-0 md:z-auto md:flex md:h-screen md:shrink-0 md:translate-x-0 md:shadow-none md:transition-[width] md:duration-200 md:ease-out md:motion-reduce:transition-none",
          "md:overflow-hidden",
          isNarrow ? "md:w-14" : "md:w-[266px]",
          !isCollapsed && "md:*:w-[265px] md:*:shrink-0",
          isMobileOpen
            ? "pointer-events-auto visible translate-x-0 shadow-2xl"
            : "pointer-events-none invisible -translate-x-full shadow-none md:pointer-events-auto md:visible",
        )}
        onPointerOver={showTooltip}
        onPointerLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {/* Marca da plataforma: fora da área com rolagem, para a barra de rolagem não estreitar o nome */}
        <div
          className={cn(
            "border-line flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3",
            isCollapsed && "md:justify-center md:px-2",
          )}
        >
          <span
            className={cn(
              "text-ink flex min-w-0 items-center gap-2 font-serif text-base leading-snug font-bold",
              hideWhenCollapsed,
            )}
          >
            <BrandLogo variant="header" className="h-7 w-7 shrink-0" />
            <span className="truncate">{brandName}</span>
          </span>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="text-mute2 hover:bg-line2 hover:text-ink focus-visible:ring-brand -mr-1.5 hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none md:flex"
            aria-label={
              isNarrow ? "Expandir menu lateral" : "Recolher menu lateral"
            }
            aria-expanded={!isNarrow}
            data-sidebar-tooltip
          >
            {isNarrow ? (
              <PanelLeftOpen strokeWidth={1.8} className="h-4 w-4" />
            ) : (
              <PanelLeftClose strokeWidth={1.8} className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="border-line bg-page text-mute2 hover:text-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors md:hidden"
            aria-label="Fechar menu"
          >
            <X strokeWidth={2} className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          onScroll={hideTooltip}
        >
          {/* Município */}
          {isCollapsed && (
            <h1 className="sr-only hidden md:block">{displayTitle}</h1>
          )}
          <div className={cn("border-line border-b p-4", hideWhenCollapsed)}>
            {portais && portais.length > 0 && onPortalChange ? (
              <>
                <h1 className="sr-only">{displayTitle}</h1>
                <PortalSelect
                  portais={portais}
                  selectedSlug={portalSlug || (portais[0]?.portalSlug ?? "")}
                  onChange={onPortalChange}
                />
              </>
            ) : (
              <h1>{displayTitle}</h1>
            )}
          </div>

          {/* Seção de Filtros */}
          <div
            className={cn(
              "border-line space-y-2.5 border-b px-4 py-3.5",
              hideWhenCollapsed,
            )}
          >
            <p className="text-mute2 text-[11px] font-semibold">Filtros</p>
            <div className="space-y-2">
              <div>
                <label
                  htmlFor="exercice-select"
                  className="text-mute mb-1 block text-[11px] font-medium"
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
                <span className="text-mute mb-1 block text-[11px] font-medium">
                  Órgão
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
          <nav className={cn("space-y-3 p-4", isCollapsed && "md:p-2")}>
            {/* Opções principais isoladas no topo sem cabeçalho de grupo */}
            <div className="space-y-2">
              <Link
                href={visaoGeralHref}
                {...collapsedLinkProps("Visão geral")}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2.5 border-l-2 px-3 py-2.5 text-xs font-medium transition-colors sm:min-h-0 md:py-1.5",
                  collapsedLinkClass,
                  isVisaoGeralActive
                    ? "border-ink text-ink font-semibold"
                    : "text-mute hover:text-ink border-transparent",
                )}
              >
                <LayoutDashboard
                  strokeWidth={1.6}
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isVisaoGeralActive ? "text-ink" : "text-mute2",
                  )}
                />
                <span className={hideWhenCollapsed}>Visão geral</span>
              </Link>

              <Link
                href={radarHref}
                {...collapsedLinkProps(
                  typeof radarAlertCount === "number" && radarAlertCount > 0
                    ? `Radar Cívico, ${radarAlertCount} alertas críticos`
                    : "Radar Cívico",
                )}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center justify-between gap-2 border-l-2 px-3 py-2.5 text-xs font-medium transition-colors sm:min-h-0 md:py-1.5",
                  collapsedLinkClass,
                  isRadarActive
                    ? "border-ink text-ink font-semibold"
                    : "text-mute hover:text-ink border-transparent",
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
                  <span className={cn("truncate", hideWhenCollapsed)}>
                    Radar Cívico
                  </span>
                </div>
                {typeof radarAlertCount === "number" && radarAlertCount > 0 && (
                  <span
                    role="status"
                    className={cn(
                      "border-danger-text bg-page text-danger-text inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      hideWhenCollapsed,
                    )}
                    aria-label={`${radarAlertCount} alertas críticos apurados`}
                  >
                    <span
                      aria-hidden="true"
                      className="bg-danger-fill h-1.5 w-1.5 rounded-full motion-safe:animate-pulse motion-reduce:animate-none"
                    />
                    <span className="tabular-nums">{radarAlertCount}</span>
                  </span>
                )}
              </Link>

              <Link
                href={farmaciaHref}
                {...collapsedLinkProps("Farmácia SUS")}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2.5 border-l-2 px-3 py-2.5 text-xs font-medium transition-colors sm:min-h-0 md:py-1.5",
                  collapsedLinkClass,
                  isFarmaciaActive
                    ? "border-ink text-ink font-semibold"
                    : "text-mute hover:text-ink border-transparent",
                )}
              >
                <Pill
                  strokeWidth={1.6}
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isFarmaciaActive ? "text-ink" : "text-mute2",
                  )}
                />
                <span className={hideWhenCollapsed}>Farmácia SUS</span>
              </Link>
            </div>

            {/* Demais Grupos de Navegação */}
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <p
                  className={cn(
                    "text-mute2 mb-1.5 px-3 text-[11px] font-semibold",
                    hideWhenCollapsed,
                  )}
                >
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
                      {...collapsedLinkProps(item.name)}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex min-h-[44px] items-center justify-between gap-2 border-l-2 px-3 py-2.5 text-xs font-medium transition-colors sm:min-h-0 md:py-1.5",
                        collapsedLinkClass,
                        isActive
                          ? "border-ink text-ink font-semibold"
                          : "text-mute hover:text-ink border-transparent",
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
                        <span className={cn("truncate", hideWhenCollapsed)}>
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Rodapé: compartilhar e alternador de tema */}
        <div
          className={cn(
            "border-line space-y-2 border-t p-4 md:p-3",
            hideWhenCollapsed,
          )}
        >
          <div className="hidden md:block">
            {desktopShareSlot ?? (
              <ShareButton variant="sidebar" onShare={onShare} />
            )}
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {tooltip &&
        createPortal(
          <div
            role="tooltip"
            className="bg-ink text-onink pointer-events-none fixed z-70 -translate-y-1/2 rounded-lg px-2.5 py-1.5 font-sans text-xs whitespace-nowrap shadow-xl"
            style={{ top: tooltip.top, left: tooltip.left }}
          >
            {tooltip.text}
          </div>,
          document.body,
        )}
    </>
  );
}
