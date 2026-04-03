"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppShellHeader from "@/components/AppShellHeader";
import { Card } from "@/components/ui/card";
import GenerationHistory from "@/components/GenerationHistory";
import { createClient } from "../../../lib/supabase/client";

export default function HistoryPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const guard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      await fetch("/api/generations/enrich-company", {
        method: "POST",
      }).catch(() => null);

      setIsCheckingAuth(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
      }
    });

    void guard();
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (isCheckingAuth) {
    return <main className="app-shell-bg min-h-screen" />;
  }

  return (
    <main className="app-shell-bg min-h-screen px-6 pb-8 pt-32">
      <AppShellHeader subtitle="Generation Archive" />
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">All resume generations</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Open any completed generation to view the dedicated resume page with company label and export actions.
          </p>
        </Card>

        <GenerationHistory limit={50} />
      </div>
    </main>
  );
}
