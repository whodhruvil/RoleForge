"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppShellHeader from "@/components/AppShellHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDisplayCompanyName } from "@/lib/job";
import { createClient } from "../../../../lib/supabase/client";

type GenerationDetail = {
  id: string;
  job_url: string;
  company_name: string | null;
  status: string;
  download_url: string | null;
  created_at: string | null;
};

export default function ResumeDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const generationId = params?.id ?? "";
  const [row, setRow] = useState<GenerationDetail | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const guard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

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

  useEffect(() => {
    if (!generationId || isCheckingAuth) {
      return;
    }

    const loadDetail = async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("generations")
        .select("*")
        .eq("id", generationId)
        .maybeSingle();

      if (queryError) {
        setError("Failed to load generated resume.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Resume not found.");
        setLoading(false);
        return;
      }

      setRow(data as GenerationDetail);
      setError(null);
      setLoading(false);
    };

    void loadDetail();
  }, [generationId, isCheckingAuth, supabase]);

  if (isCheckingAuth) {
    return <main className="app-shell-bg min-h-screen" />;
  }

  const companyName = getDisplayCompanyName(row?.company_name, row?.job_url ?? null);

  return (
    <main className="app-shell-bg min-h-screen px-6 pb-8 pt-32">
      <AppShellHeader subtitle="Generated Resume Detail" />
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Card className="p-6">
          {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading generated resume...</p> : null}
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          {!loading && !error && row ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--accent-2)]">Company label from JD URL</p>
                <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{companyName}</h1>
                <p className="mt-2 break-all text-sm text-[var(--text-secondary)]">{row.job_url}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Status</p>
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{row.status}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Generation ID</p>
                  <p className="mt-1 break-all text-sm text-[var(--text-primary)]">{row.id}</p>
                </div>
              </div>

              {row.status === "completed" && row.download_url ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => window.open(row.download_url!, "_blank", "noopener,noreferrer")}
                    className="h-11"
                  >
                    Open Resume PDF
                  </Button>
                  <a href={row.download_url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                    <Button variant="outline" className="h-11">
                      Direct Download Link
                    </Button>
                  </a>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  PDF is not available yet for this generation.
                </p>
              )}
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
