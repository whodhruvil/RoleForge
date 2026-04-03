"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import TopNavigation from "@/components/TopNavigation";
import { createClient } from "../../lib/supabase/client";

type AppShellHeaderProps = {
  subtitle?: string;
};

function WorkspaceLogo() {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(118,169,255,0.5)] bg-[linear-gradient(145deg,rgba(24,34,62,0.95),rgba(7,10,20,0.95))] shadow-[0_10px_24px_rgba(4,7,19,0.65)]">
      <svg viewBox="0 0 34 34" className="h-5 w-5" aria-hidden="true">
        <path d="M17 2l12 7v16l-12 7-12-7V9z" fill="rgba(98,154,255,0.2)" stroke="rgba(147,199,255,0.82)" />
        <path d="M11 23V10h6.5c2.7 0 4.5 1.7 4.5 4.1 0 2.1-1.3 3.3-2.9 3.7l3.1 5.2h-3.5l-2.8-4.8h-1.8V23zM14.1 15.8h2.9c1.2 0 1.9-.7 1.9-1.7 0-1-.8-1.7-1.9-1.7h-2.9z" fill="#d8ecff" />
      </svg>
    </span>
  );
}

export default function AppShellHeader({ subtitle = "Resume Command Center" }: AppShellHeaderProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="fixed inset-x-0 top-4 z-50 px-6">
      <header className="glass-card mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <WorkspaceLogo />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">RoleForge AI</p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TopNavigation />
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </header>
    </div>
  );
}
