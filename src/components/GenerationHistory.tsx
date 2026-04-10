"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDisplayCompanyName } from "@/lib/job";
import { createClient } from "../../lib/supabase/client";

type Generation = {
  id: string;
  job_url: string;
  company_name: string | null;
  status: "processing" | "completed" | "error" | "cancelled" | string;
  download_url: string | null;
  created_at: string | null;
};

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();

  const minutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(minutes) < 60) {
    return rtf.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) {
    return rtf.format(days, "day");
  }

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) {
    return rtf.format(months, "month");
  }

  const years = Math.round(months / 12);
  return rtf.format(years, "year");
}

function StatusBadge({ status }: { status: Generation["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Completed
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/35 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        Error
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/30 bg-slate-500/15 px-2.5 py-1 text-xs font-medium text-slate-200">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
      Processing
    </span>
  );
}

type GenerationHistoryProps = {
  limit?: number;
  showPageLink?: boolean;
};

export default function GenerationHistory({ limit = 10, showPageLink = false }: GenerationHistoryProps) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchRows = useCallback(
    async (currentUserId: string) => {
      const { data, error: queryError } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (queryError) {
        setError("Failed to load generation history.");
        return;
      }

      setRows((data ?? []) as Generation[]);
      setError(null);
    },
    [limit, supabase],
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await fetchRows(user.id);
      setLoading(false);
    };

    void init();
  }, [fetchRows, supabase]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`generation-history:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generations",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string };
          if (row?.status && row.status !== "processing") {
            void fetchRows(userId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchRows, supabase, userId]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent generations</h3>
        {showPageLink ? (
          <Link href="/history" className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--accent-2)] hover:opacity-90">
            View all
          </Link>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading history...</p> : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No generations yet. Create your first tailored resume.</p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="glass-card flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-2)]">
                {getDisplayCompanyName(row.company_name, row.job_url)}
              </p>
              <p className="truncate text-sm font-medium text-[var(--text-primary)]" title={row.job_url}>
                {row.job_url}
              </p>
              <p suppressHydrationWarning className="mt-1 text-xs text-[var(--text-muted)]">{formatRelativeTime(row.created_at)}</p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={row.status} />
              {row.status === "completed" && row.download_url ? (
                <>
                  <Link href={`/resumes/${row.id}`} className="inline-flex">
                    <Button size="sm" variant="outline">Open</Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => window.open(row.download_url!, "_blank", "noopener,noreferrer")}
                  >
                    Download
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
