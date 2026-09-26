import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallButton, PwaInstaller } from "./pwa-installer";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/porciuncula_prefeitura",
}));

describe("PwaInstaller Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const registerMock = vi.fn().mockResolvedValue({
      addEventListener: vi.fn(),
      waiting: null,
    });

    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      value: {
        register: registerMock,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        reload: vi.fn(),
      },
    });
  });

  it("registers service worker on mount if supported", () => {
    render(<PwaInstaller />);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
  });

  it("does not render floating banner by default when beforeinstallprompt event fires", () => {
    const promptMock = vi.fn();
    render(<PwaInstaller />);

    const beforeInstallEvent = new Event("beforeinstallprompt");
    Object.assign(beforeInstallEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    expect(
      screen.queryByText("Instale o App MaisTransparencia no seu dispositivo"),
    ).not.toBeInTheDocument();
  });

  it("renders install banner when beforeinstallprompt event fires and showFloatingPrompt is true", async () => {
    const promptMock = vi.fn();
    render(<PwaInstaller showFloatingPrompt={true} />);

    const beforeInstallEvent = new Event("beforeinstallprompt");
    Object.assign(beforeInstallEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    expect(
      await screen.findByText(
        "Instale o App MaisTransparencia no seu dispositivo",
      ),
    ).toBeInTheDocument();
    expect(posthog.capture).toHaveBeenCalledWith("pwa_install_banner_viewed");

    const installButton = screen.getByRole("button", { name: "Instalar" });
    fireEvent.click(installButton);
    expect(promptMock).toHaveBeenCalled();
    expect(localStorage.getItem("pwa_dismissed")).toBe("true");
    expect(posthog.capture).toHaveBeenCalledWith("pwa_install_clicked");
  });

  it("renders update banner when a waiting service worker is detected", async () => {
    const postMessageMock = vi.fn();
    const waitingWorkerMock = {
      postMessage: postMessageMock,
    };

    const registerSpy = vi.spyOn(navigator.serviceWorker, "register");
    registerSpy.mockResolvedValueOnce({
      addEventListener: vi.fn(),
      waiting: waitingWorkerMock as unknown as ServiceWorker,
    } as unknown as ServiceWorkerRegistration);

    render(<PwaInstaller />);

    const updateBannerText = await screen.findByText(
      /Nova versão da aplicação disponível/i,
    );
    expect(updateBannerText).toBeInTheDocument();
    expect(posthog.capture).toHaveBeenCalledWith("pwa_update_banner_viewed");

    const updateButton = screen.getByRole("button", {
      name: "Atualizar Agora",
    });
    fireEvent.click(updateButton);
    expect(postMessageMock).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(posthog.capture).toHaveBeenCalledWith("pwa_update_clicked");
  });

  it("suppresses install banner when running in standalone PWA mode", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<PwaInstaller />);

    const beforeInstallEvent = new Event("beforeinstallprompt");
    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    expect(
      screen.queryByText("Instale o App MaisTransparencia no seu dispositivo"),
    ).not.toBeInTheDocument();
  });

  it("persists dismissal when close button is clicked and suppresses banner on subsequent events", async () => {
    const promptMock = vi.fn();
    render(<PwaInstaller showFloatingPrompt={true} />);

    const beforeInstallEvent = new Event("beforeinstallprompt");
    Object.assign(beforeInstallEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });

    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    expect(
      await screen.findByText(
        "Instale o App MaisTransparencia no seu dispositivo",
      ),
    ).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: "Fechar" });
    fireEvent.click(closeButton);

    expect(
      screen.queryByText("Instale o App MaisTransparencia no seu dispositivo"),
    ).not.toBeInTheDocument();

    expect(localStorage.getItem("pwa_dismissed")).toBe("true");
    expect(posthog.capture).toHaveBeenCalledWith("pwa_install_dismissed");
  });

  it("captures the native prompt outcome after the user answers it", async () => {
    const promptMock = vi.fn();
    render(<PwaInstaller showFloatingPrompt={true} />);

    const beforeInstallEvent = new Event("beforeinstallprompt");
    Object.assign(beforeInstallEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });

    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    fireEvent.click(await screen.findByRole("button", { name: "Instalar" }));

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith(
        "pwa_install_prompt_outcome",
        { outcome: "dismissed" },
      );
    });
  });

  it("renders discrete PwaInstallButton when beforeinstallprompt fires and installs on click", async () => {
    const promptMock = vi.fn();
    render(<PwaInstallButton />);

    const beforeInstallEvent = new Event("beforeinstallprompt");
    Object.assign(beforeInstallEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    const button = await screen.findByRole("button", {
      name: "Instalar Aplicativo",
    });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(promptMock).toHaveBeenCalled();
    expect(posthog.capture).toHaveBeenCalledWith("pwa_install_clicked");
  });

  it("captures pwa_installed when the browser reports a completed install", () => {
    render(<PwaInstaller />);

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(posthog.capture).toHaveBeenCalledWith("pwa_installed");
    expect(localStorage.getItem("pwa_installed")).toBe("true");
  });

  it("suppresses install banner when pwa_dismissed is set in localStorage", () => {
    localStorage.setItem("pwa_dismissed", "true");

    render(<PwaInstaller />);

    const beforeInstallEvent = new Event("beforeinstallprompt");
    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    expect(
      screen.queryByText("Instale o App MaisTransparencia no seu dispositivo"),
    ).not.toBeInTheDocument();
  });

  it("renders PwaInstallButton with variant='sidebar' and calls install with source metadata", async () => {
    const promptMock = vi.fn();
    render(<PwaInstallButton variant="sidebar" />);

    const beforeInstallEvent = new Event("beforeinstallprompt");
    Object.assign(beforeInstallEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    const button = await screen.findByRole("button", {
      name: /Instalar Aplicativo/i,
    });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(promptMock).toHaveBeenCalled();
    expect(posthog.capture).toHaveBeenCalledWith("pwa_install_clicked", {
      source: "sidebar",
    });
  });

  it("renders mobile banner when minPageViews is reached and suppresses when push prompt is open", async () => {
    sessionStorage.setItem("session_page_views", "2");

    const promptMock = vi.fn();
    render(
      <PwaInstaller showMobileBanner={true} minPageViews={2} delayMs={0} />,
    );

    const beforeInstallEvent = new Event("beforeinstallprompt");
    Object.assign(beforeInstallEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    // Deve exibir o banner mobile
    expect(
      await screen.findByRole("complementary", {
        name: "Instalação do aplicativo",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Instale o MaisTransparência")).toBeInTheDocument();

    // Se o evento push-prompt:state indicar que o prompt de push abriu, deve ocultar o banner de PWA
    act(() => {
      window.dispatchEvent(
        new CustomEvent("push-prompt:state", { detail: { isOpen: true } }),
      );
    });

    expect(
      screen.queryByRole("complementary", {
        name: "Instalação do aplicativo",
      }),
    ).not.toBeInTheDocument();

    // Quando o prompt de push fechar, deve reexibir
    act(() => {
      window.dispatchEvent(
        new CustomEvent("push-prompt:state", { detail: { isOpen: false } }),
      );
    });

    expect(
      await screen.findByRole("complementary", {
        name: "Instalação do aplicativo",
      }),
    ).toBeInTheDocument();
  });

  it("does not render mobile banner when page views are below minPageViews", () => {
    sessionStorage.setItem("session_page_views", "1");

    render(
      <PwaInstaller showMobileBanner={true} minPageViews={2} delayMs={0} />,
    );

    const beforeInstallEvent = new Event("beforeinstallprompt");
    act(() => {
      window.dispatchEvent(beforeInstallEvent);
    });

    expect(
      screen.queryByRole("complementary", {
        name: "Instalação do aplicativo",
      }),
    ).not.toBeInTheDocument();
  });
});
