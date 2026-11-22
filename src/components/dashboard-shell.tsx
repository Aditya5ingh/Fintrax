"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  ShieldCheck,
  Receipt,
  CalendarDays,
} from "lucide-react";
import { Brand } from "./brand";
import { ThemeToggle } from "./providers";
import { Button } from "./ui/button";
export function DashboardShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Brand />
        <div>
          <div className="text-xs muted px-4 mb-3 tracking-widest">
            YOUR WORKSPACE
          </div>
          <nav>
            {[
              { url: "/dashboard", icon: LayoutDashboard, text: "Overview" },
              {
                url: "/dashboard/monthly",
                icon: CalendarDays,
                text: "Monthly finances",
              },
              { url: "/dashboard/expenses", icon: Receipt, text: "Expenses" },
              {
                url: "/dashboard/settings",
                icon: Settings,
                text: "Profile & settings",
              },
            ].map((l) => (
              <Link
                onClick={() => setOpen(false)}
                key={l.url}
                className={`nav-link ${path === l.url ? "active" : ""}`}
                href={l.url}
              >
                <l.icon size={19} />
                {l.text}
              </Link>
            ))}
          </nav>
        </div>
        <div className="side-note">
          <ShieldCheck size={22} className="mb-3" />
          <strong className="block mb-1">A space of your own</strong>Your
          financial account starts empty. You decide what comes next.
        </div>
        <Button
          variant="ghost"
          className="justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut size={18} />
          Sign out
        </Button>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="menu-button"
              aria-label="Toggle navigation"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu size={22} />
            </Button>
            <span className="header-label text-sm muted">
              Your money, with a little more clarity.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3"
            >
              <span className="text-sm hidden sm:block">{name}</span>
              <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            </Link>
            <Button
              className="sm:hidden"
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
