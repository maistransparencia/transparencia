import { fireEvent, render, screen } from "@testing-library/react";
import type { PortalConfig } from "@transparencia/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MunicipalLandingClient } from "./municipal-landing-client";

const mockBProgressStart = vi.fn();
vi.mock("@bprogress/core", () => ({
  BProgress: {
    start: () => mockBProgressStart(),
  },
}));

const mockPush = vi.fn();
let currentPathname = "/";
const mockSearchParams = new URLSearchParams("select=true");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

const mockPortais: PortalConfig[] = [
  {
    portalSlug: "porciuncula_prefeitura",
    displayName: "Porciúncula",
    uf: "RJ",
    isDefault: true,
    ibgeCode: "3304106",
  } as unknown as PortalConfig,
  {
    portalSlug: "natividade_prefeitura",
    displayName: "Natividade",
    uf: "RJ",
    isDefault: false,
    ibgeCode: "3303108",
  } as unknown as PortalConfig,
];

describe("MunicipalLandingClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = "/";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza a lista de municípios e dispara BProgress.start ao selecionar um portal", () => {
    render(<MunicipalLandingClient portais={mockPortais} />);

    expect(screen.getByText("Porciúncula")).toBeInTheDocument();
    expect(screen.getByText("Natividade")).toBeInTheDocument();

    const natividadeLink = screen.getByRole("link", {
      name: /Natividade/i,
    });
    fireEvent.click(natividadeLink);

    expect(mockBProgressStart).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/natividade_prefeitura");
  });

  it("não dispara BProgress.start nem router.push se já estiver no mesmo portal", () => {
    currentPathname = "/porciuncula_prefeitura";
    render(<MunicipalLandingClient portais={mockPortais} />);

    const porciunculaLink = screen.getByRole("link", {
      name: /Porciúncula/i,
    });
    fireEvent.click(porciunculaLink);

    expect(mockBProgressStart).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
