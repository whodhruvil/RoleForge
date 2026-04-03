"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TopNavigation from "@/components/TopNavigation";
import { createClient } from "../../lib/supabase/client";
import { cn } from "@/lib/utils";

function LogoMark() {
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(118,169,255,0.5)] bg-[linear-gradient(145deg,rgba(24,34,62,0.95),rgba(7,10,20,0.95))] shadow-[0_10px_24px_rgba(4,7,19,0.65)]">
      <svg viewBox="0 0 34 34" className="h-5 w-5" aria-hidden="true">
        <path d="M17 2l12 7v16l-12 7-12-7V9z" fill="rgba(98,154,255,0.2)" stroke="rgba(147,199,255,0.82)" />
        <path d="M11 23V10h6.5c2.7 0 4.5 1.7 4.5 4.1 0 2.1-1.3 3.3-2.9 3.7l3.1 5.2h-3.5l-2.8-4.8h-1.8V23zM14.1 15.8h2.9c1.2 0 1.9-.7 1.9-1.7 0-1-.8-1.7-1.9-1.7h-2.9z" fill="#d8ecff" />
      </svg>
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const hasUser = Boolean(session?.user);
      setIsAuthenticated(hasUser);
      if (hasUser) {
        router.replace("/dashboard");
      }
    };

    const handlePageShow = () => {
      void loadSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadSession();
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasUser = Boolean(session?.user);
      setIsAuthenticated(hasUser);
      if (hasUser) {
        router.replace("/dashboard");
      }
    });

    void loadSession();
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    router.replace("/login");
  };

  return (
    <main className="app-shell-bg min-h-screen px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card className="landing-enter landing-enter-1 sticky top-4 z-30 flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">RoleForge AI</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">Career Application OS</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] lg:flex">
            <a href="#features" className="transition hover:text-[var(--text-primary)]">Features</a>
            <a href="#workflow" className="transition hover:text-[var(--text-primary)]">Workflow</a>
            <a href="#pricing" className="transition hover:text-[var(--text-primary)]">Pricing</a>
            <a href="#faq" className="transition hover:text-[var(--text-primary)]">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <TopNavigation />
            {isAuthenticated ? (
              <>
                <Button variant="outline" size="sm" className="px-4 text-sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "px-4 text-sm")}>
                  Getting Started
                </Link>
                <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "px-4 text-sm")}>
                  Login
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card className="landing-enter landing-enter-2 glow-border relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(65,216,246,0.25)_0%,_rgba(65,216,246,0)_72%)]" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(121,163,255,0.3)_0%,_rgba(121,163,255,0)_70%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(130,155,210,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(130,155,210,0.14)_1px,transparent_1px)] [background-size:28px_28px]" />

          <p className="inline-flex rounded-full border border-[var(--border-glass)] bg-[rgba(121,163,255,0.14)] px-3 py-1 text-xs font-semibold tracking-[0.1em] text-[var(--accent-2)]">
            RoleForge AI Career SaaS
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-[var(--text-primary)] sm:text-6xl">
            One platform for generation, history tracking, and resume delivery.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            RoleForge AI transforms job links into tailored resumes, organizes every generation in a dedicated history
            vault, and gives each completed output its own company-labeled resume page.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "text-center")}>
              Start Building Free
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-center")}>
              Enter Workspace
            </Link>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <article className="rounded-xl border border-[var(--border-glass)] bg-[rgba(10,14,26,0.65)] p-5">
              <p className="text-3xl font-semibold text-[var(--text-primary)]">6.8x</p>
              <p className="mt-2 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Faster Iteration</p>
            </article>
            <article className="rounded-xl border border-[var(--border-glass)] bg-[rgba(10,14,26,0.65)] p-5">
              <p className="text-3xl font-semibold text-[var(--text-primary)]">87%</p>
              <p className="mt-2 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">ATS Match Lift</p>
            </article>
            <article className="rounded-xl border border-[var(--border-glass)] bg-[rgba(10,14,26,0.65)] p-5">
              <p className="text-3xl font-semibold text-[var(--text-primary)]">99.9%</p>
              <p className="mt-2 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Platform Uptime</p>
            </article>
          </div>
        </Card>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Workspace", text: "Guided generation flow with timeout safety and realtime progress states." },
            { title: "History Vault", text: "Separate page to inspect all generations, statuses, and completed outputs." },
            { title: "Resume Detail Page", text: "Dedicated route per generation with company label from JD URL." },
          ].map((item, index) => (
            <Card key={item.title} className={`landing-enter landing-enter-${Math.min(index + 3, 6)} p-5`}>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.text}</p>
            </Card>
          ))}
        </section>

        <section id="features" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Smart Role Parsing",
              text: "Extracts responsibilities, skill clusters, and hiring intent from any listing URL.",
            },
            {
              title: "Narrative Rewrite Engine",
              text: "Transforms bullet points into outcome-led copy mapped to target role signals.",
            },
            {
              title: "Generation History Page",
              text: "Browse completed, failed, and cancelled runs from a dedicated archive view.",
            },
            {
              title: "Resume Detail Route",
              text: "Open a dedicated resume page with company label, status, and download actions.",
            },
          ].map((feature, index) => (
            <Card key={feature.title} className={`landing-enter landing-enter-${Math.min(index + 3, 6)} p-5`}>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{feature.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{feature.text}</p>
            </Card>
          ))}
        </section>

        <section id="workflow" className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="landing-enter landing-enter-4 p-7">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent-2)]">Workflow</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">From job link to final PDF in 3 guided stages</h2>
            <div className="mt-6 space-y-4">
              {[
                "Ingest job listing and build an opportunity blueprint.",
                "Re-rank and rewrite your base resume against role requirements.",
                "Compile polished PDF and push to downloadable history.",
              ].map((step, idx) => (
                <div key={step} className="flex items-start gap-3 rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(118,169,255,0.2)] text-sm font-semibold text-[var(--text-primary)]">
                    {idx + 1}
                  </span>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">{step}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="landing-enter landing-enter-5 relative overflow-hidden p-7">
            <div className="pointer-events-none absolute -right-10 top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(65,216,246,0.22)_0%,_rgba(65,216,246,0)_72%)]" />
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent-2)]">Live Pulse</p>
            <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">Deploy-ready for solo users and teams</h3>
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Generation Throughput</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">1,240 / day</p>
              </div>
              <div className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Avg Completion Time</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">52 seconds</p>
              </div>
              <div className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Supported Sources</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">LinkedIn, Naukri, company career pages, remote boards</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            '"We replaced manual edits and now ship tailored resumes before other applicants even open their templates."',
            '"RoleForge AI became our single workflow for resume output quality, speed, and consistency."',
            '"The generation history plus one-click exports made interview prep way easier for our cohort."',
          ].map((quote, index) => (
            <Card key={quote} className={`landing-enter landing-enter-${Math.min(index + 4, 6)} p-6`}>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">{quote}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Verified Customer</p>
            </Card>
          ))}
        </section>

        <section id="pricing" className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Starter",
              price: "$0",
              detail: "For individual job seekers validating workflow fit.",
              bullets: ["5 generations / month", "Basic keyword alignment", "Single resume profile"],
            },
            {
              title: "Pro",
              price: "$19",
              detail: "For serious applicants applying across multiple tracks.",
              bullets: ["Unlimited generations", "Advanced role-fit scoring", "Priority processing"],
            },
            {
              title: "Team",
              price: "$79",
              detail: "For career cohorts, recruiting agencies, and placement teams.",
              bullets: ["Workspace seats", "Shared templates", "Usage analytics + export logs"],
            },
          ].map((plan, index) => (
            <Card
              key={plan.title}
              className={cn(
                `landing-enter landing-enter-${Math.min(index + 3, 6)} p-6`,
                plan.title === "Pro" ? "glow-border border-[rgba(121,163,255,0.42)]" : "",
              )}
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">{plan.title}</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{plan.price}<span className="text-base text-[var(--text-muted)]">/mo</span></p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{plan.detail}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                {plan.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-md border border-[var(--border-glass)] bg-[rgba(8,12,23,0.7)] px-3 py-2">
                    {bullet}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </section>

        <section id="faq" className="grid gap-4 lg:grid-cols-2">
          {[
            {
              q: "Can I bring my own model key?",
              a: "Yes. RoleForge AI supports user-provided provider keys and keeps them scoped to your account settings.",
            },
            {
              q: "What happens if generation hangs?",
              a: "Each generation run auto-cancels at 1 minute 30 seconds and can also be cancelled manually anytime.",
            },
            {
              q: "Can I reuse previous outputs?",
              a: "Yes. Every completed generation is stored in history with quick re-download options.",
            },
            {
              q: "Is this only for one job board?",
              a: "No. It works with any public job URL where listing text can be read and parsed.",
            },
          ].map((item, index) => (
            <Card key={item.q} className={`landing-enter landing-enter-${Math.min(index + 3, 6)} p-6`}>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.a}</p>
            </Card>
          ))}
        </section>

        <Card className="landing-enter landing-enter-6 glow-border relative overflow-hidden p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(121,163,255,0.18),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(65,216,246,0.12),transparent_30%)]" />
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent-2)]">Ready to launch</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">Start your RoleForge AI workspace today</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            Replace repetitive resume editing with a predictable SaaS pipeline built for speed, consistency, and better application outcomes.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "text-center")}>
              Create Account
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-center")}>
              Sign In
            </Link>
          </div>
        </Card>

        <footer className="landing-enter landing-enter-6 pb-2 pt-3 text-xs text-[var(--text-muted)]">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} RoleForge AI. All rights reserved.</p>
            <p>Built for modern job seekers and career teams.</p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .landing-enter {
          opacity: 0;
          transform: translateY(18px);
          animation: riseIn 560ms ease forwards;
        }
        .landing-enter-1 { animation-delay: 60ms; }
        .landing-enter-2 { animation-delay: 120ms; }
        .landing-enter-3 { animation-delay: 180ms; }
        .landing-enter-4 { animation-delay: 240ms; }
        .landing-enter-5 { animation-delay: 300ms; }
        .landing-enter-6 { animation-delay: 360ms; }
        @keyframes riseIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
