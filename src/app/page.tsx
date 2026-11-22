import Link from "next/link";
import {
  Check,
  ShieldCheck,
  LockKeyhole,
  Wallet,
  ChartNoAxesCombined,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/providers";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <div className="site-container">
      <header className="site-header">
        <Brand />
        <nav>
          <a href="#features">Why FinanceFlow</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link className="text-sm font-semibold hidden sm:block" href="/login">
            Log in
          </Link>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">
              <span className="w-5 h-px bg-current" /> A little clarity. A lot
              of possibility.
            </div>
            <h1>
              Your money.
              <br />
              Your life.
              <br />
              <em>In better balance.</em>
            </h1>
            <p>
              Make space for the things that matter. Bring your financial life
              together in one calm, thoughtfully designed place.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/register">Create your free account</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#features">Explore FinanceFlow</a>
              </Button>
            </div>
            <div className="hero-foot">
              <span className="flex gap-1 items-center">
                <Check size={14} /> Free to get started
              </span>
              <span className="flex gap-1 items-center">
                <Check size={14} /> No bank connection required
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustration of a future financial overview"
          >
            <div className="preview">
              <div className="preview-top">
                <span className="font-semibold">Your financial picture</span>
                <span className="muted">Illustration</span>
              </div>
              <div className="text-xs muted">MORE CLARITY, EVERY DAY</div>
              <div className="balance">A fresh perspective.</div>
              <div className="chart-grid" aria-hidden="true">
                {[25, 40, 35, 60, 53, 78, 70, 95, 85, 110].map((h, i) => (
                  <i key={i} style={{ height: h }} />
                ))}
              </div>
              <div className="preview-row">
                <span className="flex gap-2 items-center">
                  <Wallet size={17} /> Everything in one place
                </span>
                <Check size={16} className="text-emerald-600" />
              </div>
              <div className="preview-row">
                <span className="flex gap-2 items-center">
                  <ShieldCheck size={17} /> Built around your privacy
                </span>
                <Check size={16} className="text-emerald-600" />
              </div>
            </div>
            <div className="floating-note">
              <Sparkles size={24} />
              <span>
                <strong>A clean slate. A clearer future.</strong>
                <br />
                <span className="opacity-75">
                  Your journey starts with you.
                </span>
              </span>
            </div>
          </div>
        </section>
        <div className="trust-strip" id="security">
          <span>
            <LockKeyhole size={18} /> Encrypted sessions
          </span>
          <span>
            <Fingerprint size={18} /> Private by design
          </span>
          <span>
            <ShieldCheck size={18} /> Your account. Your data.
          </span>
        </div>
        <section className="section" id="features">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Less noise. More understanding.</div>
              <h2>
                A better relationship
                <br />
                with your money.
              </h2>
            </div>
            <p>
              Start with a secure personal space. Build a financial routine that
              feels right for you.
            </p>
          </div>
          <div className="feature-grid">
            {[
              {
                icon: Wallet,
                title: "A home for your finances",
                text: "Your own dashboard, your preferred currency, and a clean start. No sample balances or assumptions about your life.",
                tag: "Available now",
              },
              {
                icon: ShieldCheck,
                title: "Confidence comes standard",
                text: "Protected sign-in, secure password recovery, and an account designed to keep your information yours.",
                tag: "Available now",
              },
              {
                icon: ChartNoAxesCombined,
                title: "Room for what’s next",
                text: "Track received and expected income alongside expenses. Explore each month and year with clear totals and spending charts.",
                tag: "Monthly finance tracking",
              },
            ].map((f) => (
              <article className="card" key={f.title}>
                <div className="feature-icon">
                  <f.icon size={23} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <span className="tag">{f.tag}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="cta" id="how-it-works">
          <div>
            <h2>Your next chapter starts here.</h2>
            <p>
              Create an account. Set your preferences. Make yourself at home.
            </p>
          </div>
          <Button asChild>
            <Link href="/register">Find your financial flow</Link>
          </Button>
        </section>
      </main>
      <footer>
        <Brand />
        <span>
          © {new Date().getFullYear()} FinanceFlow. A clearer way forward.
        </span>
      </footer>
    </div>
  );
}
