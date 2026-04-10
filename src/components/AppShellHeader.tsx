"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TailarkLogo } from "@/components/ui/tailark-logo";
import TopNavigation from "@/components/TopNavigation";
import { createClient } from "../../lib/supabase/client";

type AppShellHeaderProps = {
  subtitle?: string;
};

export default function AppShellHeader({
  subtitle = "Resume Command Center",
}: AppShellHeaderProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className='fixed inset-x-0 top-2 z-50 px-3 sm:px-6'>
      <header
        className={`mx-auto w-full max-w-6xl rounded-2xl border px-4 py-3 transition-all duration-300 sm:px-5 sm:py-4 ${
          isScrolled
            ? "border-white/15 bg-[rgba(11,13,19,0.72)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className='flex items-start justify-between gap-3 sm:items-center'>
          <Link
            href='/dashboard'
            className='flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/55'
          >
            <TailarkLogo className="h-6 w-auto" />
            <div>
              <p className='text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]'>Tailark</p>
              <p className='text-xs text-[var(--text-secondary)] sm:text-sm'>
                {subtitle}
              </p>
            </div>
          </Link>

          <div className='absolute inset-0 m-auto hidden size-fit sm:block'>
            <TopNavigation />
          </div>

          <div className='hidden items-center gap-3 sm:flex'>
            <Button variant='outline' size='sm' onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>

          <button
            type='button'
            className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-glass)] bg-[rgba(9,12,21,0.8)] text-[var(--text-secondary)] transition hover:border-[rgba(121,163,255,0.56)] hover:text-[var(--text-primary)] sm:hidden'
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? (
              <svg viewBox='0 0 24 24' className='h-4 w-4' aria-hidden='true'>
                <path
                  d='M6 6l12 12M18 6L6 18'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
              </svg>
            ) : (
              <svg viewBox='0 0 24 24' className='h-4 w-4' aria-hidden='true'>
                <path
                  d='M4 7h16M4 12h16M4 17h16'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className='mt-3 space-y-2 rounded-xl border border-[var(--border-glass)] bg-[rgba(8,12,23,0.88)] p-3 sm:hidden'>
            <TopNavigation
              orientation='vertical'
              onNavigate={() => setMobileMenuOpen(false)}
            />
            <Button
              variant='outline'
              size='sm'
              className='w-full'
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        ) : null}
      </header>
    </div>
  );
}
