import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/providers";
import { ShieldCheck } from "lucide-react";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-shell">
      <aside className="auth-aside">
        <Brand />
        <div>
          <div className="eyebrow text-emerald-200">CLARITY BEGINS HERE</div>
          <h2>
            More peace of mind.
            <br />
            More room to grow.
          </h2>
          <p>
            Your financial journey is uniquely yours. Give it a thoughtful place
            to begin.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm">
            <ShieldCheck size={22} />
            Private by design. Built around you.
          </div>
        </div>
        <p className="text-sm mb-0">FinanceFlow · A clearer way forward.</p>
      </aside>
      <div className="auth-main">
        <div className="absolute right-5 top-5 rounded-lg bg-[var(--card)]">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </main>
  );
}
