"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Receipt,
  CalendarDays,
} from "lucide-react";
import { Brand } from "./brand";
import { ThemeToggle } from "./providers";
import { Button } from "./ui/button";
const navigation = [
  { url: "/dashboard", icon: LayoutDashboard, text: "Overview" },
  { url: "/dashboard/monthly", icon: CalendarDays, text: "Monthly finances" },
  { url: "/dashboard/expenses", icon: Receipt, text: "Expenses" },
  { url: "/dashboard/settings", icon: Settings, text: "Profile & settings" },
];
function Navigation({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <div className="text-xs muted px-4 mb-3 tracking-widest">
        YOUR WORKSPACE
      </div>
      <nav aria-label="Main navigation">
        {navigation.map((link) => (
          <Link
            key={link.url}
            href={link.url}
            onClick={onNavigate}
            aria-current={path === link.url ? "page" : undefined}
            className={`nav-link ${path === link.url ? "active" : ""}`}
          >
            <link.icon size={19} />
            {link.text}
          </Link>
        ))}
      </nav>
    </div>
  );
}
function SidebarFooter() {
  return (
    <>
      <div className="side-note">
        <ShieldCheck size={22} className="mb-3" />
        <strong className="block mb-1">A space of your own</strong>Your
        financial records stay private to your account.
      </div>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut size={18} />
        Sign out
      </Button>
    </>
  );
}
export function DashboardShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const currentPage =
    navigation.find((link) => link.url === path)?.text || "FinanceFlow";
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) {
      if (element.open) element.close();
      return;
    }
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
      if (element.open) element.close();
    };
  }, [open]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <Navigation path={path} />
        <SidebarFooter />
      </aside>
      <dialog
        ref={dialog}
        id="mobile-navigation"
        className="mobile-navigation"
        aria-label="Navigation"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              setOpen(false);
          }
        }}
      >
        <div className="mobile-nav-top">
          <Brand />
          <Button
            variant="ghost"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={21} />
          </Button>
        </div>
        <Navigation path={path} onNavigate={() => setOpen(false)} />
        <SidebarFooter />
      </dialog>
      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="menu-button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              <Menu size={22} />
            </Button>
            <span className="header-title">{currentPage}</span>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <Link href="/dashboard/settings" className="header-profile">
              <span className="header-name">{name}</span>
              <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            </Link>
            <Button
              className="mobile-signout"
              variant="ghost"
              aria-label="Sign out"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
