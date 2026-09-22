"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);
  const pathname = usePathname();
  useEffect(() => {
    if (wasMobileOpen.current && !mobileOpen) menuButton.current?.focus();
    wasMobileOpen.current = mobileOpen;
  }, [mobileOpen]);

  if (pathname === "/login" || (pathname.startsWith("/approve/") || pathname.startsWith("/documents/"))) {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4">Skip to content</a>
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-72 print:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              ref={menuButton}
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold text-slate-700 shadow-sm lg:hidden"
            >
              ☰
            </button>
            <div>
              <p className="text-sm font-bold text-slate-900">Shop Workspace</p>
              <p className="hidden text-xs text-slate-500 sm:block">
                MekaReports automotive service operations
              </p>
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
            Local Development
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
