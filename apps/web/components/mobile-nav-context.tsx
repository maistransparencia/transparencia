"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

export interface MobileNavContextValue {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
  closeMenu: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const _pathname = usePathname();

  useEffect(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <MobileNavContext.Provider
      value={{ isMenuOpen, setIsMenuOpen, toggleMenu, closeMenu }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav(): MobileNavContextValue {
  const context = useContext(MobileNavContext);
  if (!context) {
    return {
      isMenuOpen: false,
      setIsMenuOpen: () => {},
      toggleMenu: () => {},
      closeMenu: () => {},
    };
  }
  return context;
}
