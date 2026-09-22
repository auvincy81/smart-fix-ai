"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { SignOutButton } from "./auth/sign-out";
import { usePathname } from "next/navigation";
import { AppIcon } from "./icons";

export const navigation = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Customers", href: "/customers", icon: "customers" },
  { label: "Vehicles", href: "/vehicles", icon: "vehicles" },
  { label: "Appointments", href: "/appointments", icon: "appointments" },
  { label: "Work Orders", href: "/work-orders", icon: "workOrders" },
  { label: "AI Diagnosis", href: "/diagnosis", icon: "diagnosis" },
  { label: "Inspections", href: "/inspections", icon: "inspections" },
  { label: "Reports", href: "/reports", icon: "reports" },
  { label: "Service Reminders", href: "/service-reminders", icon: "reminders" },
  { label: "Beta Feedback", href: "/feedback", icon: "questions" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

type AppSidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/" onClick={onNavigate} className="block">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-lg font-black text-white shadow-lg shadow-red-950/30">
              MR
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight">MekaReports</div>
              <div className="mt-0.5 text-xs font-medium tracking-wide text-slate-400">
                Diagnose. Document. Manage.
              </div>
            </div>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navigation.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href === "/feedback" ? `/feedback?path=${encodeURIComponent(pathname)}` : item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
              }`}
            >
              <AppIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-slate-500">
        Local Development
        <div className="mt-2 text-slate-100"><SignOutButton /></div>
      </div>
    </div>
  );
}

export function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? <MobileNavigation onClose={onClose} /> : null}
    </>
  );
}

function MobileNavigation({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const node=dialog.current;node?.showModal();closeButton.current?.focus();return()=>node?.close();},[]);
  return <dialog ref={dialog} aria-label="Shop navigation" onCancel={onClose} onClose={onClose} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-slate-950/65 lg:hidden">
    <button type="button" aria-label="Close navigation" tabIndex={-1} className="absolute inset-0" onClick={onClose}/>
    <aside className="relative h-full w-[86vw] max-w-80 bg-slate-950 pt-12 shadow-2xl"><button ref={closeButton} type="button" onClick={onClose} className="absolute right-2 top-1 z-10 min-h-11 rounded-lg px-3 text-sm font-bold text-white">Close</button><SidebarContent onNavigate={onClose}/></aside>
  </dialog>;
}
