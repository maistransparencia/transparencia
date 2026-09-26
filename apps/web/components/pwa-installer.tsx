"use client";

import { Smartphone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { env } from "@/env";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
}

function safeGetLocalStorage(key: string): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

function safeGetSessionStorage(key: string): string | null {
  try {
    return typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function checkIsStandaloneOrInstalled(): boolean {
  if (typeof window === "undefined") return false;

  const isUrlStandalone = window.location.search.includes("mode=standalone");

  const isMatchMediaStandalone =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches);

  const isNavigatorStandalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const isReferrerApp =
    typeof document !== "undefined" &&
    document.referrer.includes("android-app://");

  const isLocalStorageInstalled =
    safeGetLocalStorage("pwa_installed") === "true";

  return (
    isUrlStandalone ||
    isMatchMediaStandalone ||
    isNavigatorStandalone ||
    isReferrerApp ||
    isLocalStorageInstalled
  );
}

function checkIsBannerDismissed(cooldownDays = 30): boolean {
  if (typeof window === "undefined") return false;
  const dismissedAt = safeGetLocalStorage("pwa_dismissed_at");
  if (dismissedAt) {
    const elapsed = Date.now() - Number(dismissedAt);
    return elapsed < cooldownDays * 24 * 60 * 60 * 1000;
  }
  return safeGetLocalStorage("pwa_dismissed") === "true";
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

export interface PwaInstallerProps {
  showFloatingPrompt?: boolean;
  showMobileBanner?: boolean;
  minPageViews?: number;
  delayMs?: number;
  cooldownDays?: number;
}

export function PwaInstaller({
  showFloatingPrompt = false,
  showMobileBanner = true,
  minPageViews = 2,
  delayMs = 25000,
  cooldownDays = 30,
}: PwaInstallerProps = {}) {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPushPromptOpen, setIsPushPromptOpen] = useState(false);
  const [canShowMobilePrompt, setCanShowMobilePrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standaloneOrInstalled = checkIsStandaloneOrInstalled();
    setIsStandalone(standaloneOrInstalled);
    setIsDismissed(checkIsBannerDismissed(cooldownDays));
    setIsPushPromptOpen(
      safeGetSessionStorage("is_push_prompt_open") === "true",
    );

    const handlePushPromptState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      setIsPushPromptOpen(Boolean(customEvent.detail?.isOpen));
    };

    window.addEventListener("push-prompt:state", handlePushPromptState);

    if (!("serviceWorker" in navigator)) return;

    // Em ambiente de desenvolvimento local (localhost), limpar caches se existirem sem desregistrar o Service Worker
    const isDevLocalhost =
      env.NODE_ENV === "development" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    if (isDevLocalhost) {
      if (typeof window !== "undefined" && "caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    }

    // Listen for controllerchange to reload page reliably after SKIP_WAITING
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    let isMounted = true;
    let swRegistration: ServiceWorkerRegistration | null = null;
    let updateInterval: ReturnType<typeof setInterval> | null = null;
    let lastCheckedTime = 0;

    const checkForUpdates = (registration: ServiceWorkerRegistration) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const now = Date.now();
      if (now - lastCheckedTime < 60 * 1000) return; // Throttle checks to at most once per minute
      lastCheckedTime = now;
      registration.update().catch(() => {});
    };

    const handleFocus = () => {
      if (swRegistration) {
        checkForUpdates(swRegistration);
      }
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (!isMounted) return;

        swRegistration = registration;
        if (registration.waiting && isMounted) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller &&
                isMounted
              ) {
                setWaitingWorker(newWorker);
              }
            });
          }
        });

        // Check for updates on window focus and periodically every 15 minutes
        window.addEventListener("focus", handleFocus);
        updateInterval = setInterval(
          () => {
            if (isMounted && swRegistration) {
              checkForUpdates(swRegistration);
            }
          },
          15 * 60 * 1000,
        );
      })
      .catch((_error) => {});

    const handleBeforeInstallPrompt = (event: Event) => {
      if (
        checkIsStandaloneOrInstalled() ||
        checkIsBannerDismissed(cooldownDays)
      ) {
        return;
      }

      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      posthog.capture("pwa_install_banner_viewed");
    };

    const handleAppInstalled = () => {
      posthog.capture("pwa_installed");
      safeSetLocalStorage("pwa_installed", "true");
      setIsStandalone(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      isMounted = false;
      if (updateInterval) clearInterval(updateInterval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("push-prompt:state", handlePushPromptState);
      if (typeof navigator.serviceWorker.removeEventListener === "function") {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange,
        );
      }
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [cooldownDays]);

  useEffect(() => {
    if (typeof window === "undefined" || !showMobileBanner) return;
    if (pathname === undefined) return;
    if (isStandalone || isDismissed) {
      setCanShowMobilePrompt(false);
      return;
    }

    if (minPageViews > 0) {
      const currentViews = Number(
        safeGetSessionStorage("session_page_views") ?? "0",
      );
      if (currentViews < minPageViews) {
        setCanShowMobilePrompt(false);
        return;
      }
    }

    if (delayMs > 0) {
      const timer = setTimeout(() => {
        setCanShowMobilePrompt(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }

    setCanShowMobilePrompt(true);
  }, [
    showMobileBanner,
    isStandalone,
    isDismissed,
    minPageViews,
    delayMs,
    pathname,
  ]);

  useEffect(() => {
    if (waitingWorker) {
      posthog.capture("pwa_update_banner_viewed");
    }
  }, [waitingWorker]);

  const handleAppUpdate = () => {
    posthog.capture("pwa_update_clicked");
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      setWaitingWorker(null);
    }
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    posthog.capture("pwa_install_clicked");
    safeSetLocalStorage("pwa_dismissed", "true");
    safeSetLocalStorage("pwa_dismissed_at", String(Date.now()));
    setIsDismissed(true);
    installPrompt.prompt();
    installPrompt.userChoice
      .then((choiceResult: { outcome?: string }) => {
        posthog.capture("pwa_install_prompt_outcome", {
          outcome: choiceResult?.outcome ?? "unknown",
        });
        if (choiceResult?.outcome === "accepted") {
          safeSetLocalStorage("pwa_installed", "true");
          setIsStandalone(true);
        }
        setInstallPrompt(null);
      })
      .catch(() => {
        posthog.capture("pwa_install_prompt_outcome", {
          outcome: "error",
        });
        setInstallPrompt(null);
      });
  };

  const handleDismissClick = () => {
    posthog.capture("pwa_install_dismissed");
    safeSetLocalStorage("pwa_dismissed", "true");
    safeSetLocalStorage("pwa_dismissed_at", String(Date.now()));
    setIsDismissed(true);
    setInstallPrompt(null);
  };

  return (
    <>
      {waitingWorker && (
        <div className="fixed bottom-5 left-5 z-50 flex max-w-md items-center gap-3.5 rounded-xl border border-blue-200 bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-slate-900/5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 font-bold text-base text-blue-600">
            🚀
          </div>
          <div className="flex-1 font-medium text-slate-900 text-sm">
            Nova versão da aplicação disponível!
          </div>
          <button
            type="button"
            onClick={handleAppUpdate}
            className="shrink-0 cursor-pointer rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-sm transition-colors hover:bg-blue-700"
          >
            Atualizar Agora
          </button>
        </div>
      )}

      {/* Prompt flutuante clássico (ativo apenas se explicitamente requisitado via prop) */}
      {!isStandalone && !isDismissed && installPrompt && showFloatingPrompt && (
        <div className="fixed right-5 bottom-20 z-50 flex max-w-md items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-slate-900/5 md:bottom-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-base text-blue-600">
            📲
          </div>
          <div className="flex-1 font-medium text-slate-900 text-sm">
            Instale o App MaisTransparencia no seu dispositivo
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="shrink-0 cursor-pointer rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-sm transition-colors hover:bg-blue-700"
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={handleDismissClick}
            className="px-1 font-bold text-slate-400 text-xs transition-colors hover:text-slate-600"
            title="Fechar"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner condicional mobile (engajamento gradual, não concorre com push prompt) */}
      {showMobileBanner &&
        !isStandalone &&
        !isDismissed &&
        installPrompt &&
        !isPushPromptOpen &&
        canShowMobilePrompt && (
          <aside
            aria-label="Instalação do aplicativo"
            className="fixed right-3 bottom-20 left-3 z-50 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 text-slate-900 shadow-xl ring-1 ring-slate-900/5 backdrop-blur-md transition-all duration-300 md:hidden"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-xs">
                <Smartphone className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 text-xs">
                  Instale o MaisTransparência
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  Acesso rápido e direto da tela de início
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="cursor-pointer rounded-lg bg-[#1d64d8] px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700 active:scale-95"
              >
                Instalar
              </button>
              <button
                type="button"
                onClick={handleDismissClick}
                className="p-1.5 text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Dispensar aviso de instalação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </aside>
        )}
    </>
  );
}

export interface PwaInstallButtonProps {
  className?: string;
  variant?: "default" | "sidebar" | "footer";
}

export function PwaInstallButton({
  className,
  variant = "default",
}: PwaInstallButtonProps = {}) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsStandalone(checkIsStandaloneOrInstalled());
    setIsIos(isIosDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone) return null;
  // Se não houver prompt nativo e não for dispositivo iOS, oculta o botão
  if (!installPrompt && !isIos) return null;

  const handleClick = () => {
    if (installPrompt) {
      if (variant && variant !== "default") {
        posthog.capture("pwa_install_clicked", { source: variant });
      } else {
        posthog.capture("pwa_install_clicked");
      }
      installPrompt.prompt();
      installPrompt.userChoice
        .then((choiceResult: { outcome?: string }) => {
          posthog.capture("pwa_install_prompt_outcome", {
            outcome: choiceResult?.outcome ?? "unknown",
            ...(variant && variant !== "default" ? { source: variant } : {}),
          });
          if (choiceResult?.outcome === "accepted") {
            safeSetLocalStorage("pwa_installed", "true");
            setIsStandalone(true);
          }
          setInstallPrompt(null);
        })
        .catch(() => {
          posthog.capture("pwa_install_prompt_outcome", {
            outcome: "error",
            ...(variant && variant !== "default" ? { source: variant } : {}),
          });
          setInstallPrompt(null);
        });
    } else if (isIos) {
      setShowIosInstructions((prev) => !prev);
    }
  };

  if (variant === "sidebar") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          className={
            className ??
            "flex w-full items-center justify-center gap-2 rounded-lg border border-borderLine bg-white px-3 py-2.5 font-medium text-ink text-xs shadow-2xs transition-colors hover:bg-gray-50 hover:text-[#1d64d8] active:scale-[0.99]"
          }
        >
          <Smartphone
            strokeWidth={1.8}
            className="h-3.5 w-3.5 shrink-0 text-mutedText"
          />
          <span>Instalar Aplicativo</span>
        </button>
        {showIosInstructions && (
          <div
            role="status"
            className="absolute right-0 bottom-full left-0 z-50 mb-2 rounded-lg border border-borderLine bg-white p-3 text-ink text-xs shadow-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-xs">Instalar no iPhone/iPad:</p>
              <button
                type="button"
                onClick={() => setShowIosInstructions(false)}
                className="text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Fechar instruções"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-[11px] text-subtleText leading-relaxed">
              No Safari, toque no botão <strong>Compartilhar</strong> (ícone na
              barra inferior) e escolha{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          "cursor-pointer text-[11px] text-mutedText hover:text-ink hover:underline"
        }
      >
        Instalar Aplicativo
      </button>
      {showIosInstructions && (
        <div
          role="status"
          className="fixed right-4 bottom-16 z-50 max-w-xs rounded-lg border border-borderLine bg-white p-3 text-ink text-xs shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-xs">Instalar no iPhone/iPad:</p>
            <button
              type="button"
              onClick={() => setShowIosInstructions(false)}
              className="text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Fechar instruções"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-[11px] text-subtleText leading-relaxed">
            No Safari, toque no botão <strong>Compartilhar</strong> (ícone na
            barra inferior) e escolha{" "}
            <strong>Adicionar à Tela de Início</strong>.
          </p>
        </div>
      )}
    </>
  );
}
