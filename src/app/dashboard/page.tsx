"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, FileText, Gauge, Link2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import AppShellHeader from "@/components/AppShellHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractTagsFromJobUrl, inferJdTitleFromJobUrl } from "@/lib/job-intelligence";
import { cn } from "@/lib/utils";
import { isValidHttpUrl } from "@/lib/validation";
import { createClient } from "../../../lib/supabase/client";

type GenerationState = "idle" | "processing" | "completed" | "error" | "cancelled";

const PROCESSING_MESSAGES = [
  "Scraping job listing…",
  "Gemini is optimizing your resume…",
  "Compiling LaTeX…",
] as const;
const AUTO_CANCEL_TIMEOUT_MS = 90_000;
const EDUCATION_STEPS = [
  {
    title: "Paste a real job listing URL",
    detail: "Use the exact role you are applying for so the model can align keywords and outcomes.",
  },
  {
    title: "Let AI map your existing experience",
    detail: "Your base resume is re-ranked against role requirements before writing new phrasing.",
  },
  {
    title: "Review and send the final PDF",
    detail: "Download, do a quick quality check, and submit with confidence.",
  },
] as const;

const PRO_TIPS = [
  "Use direct job pages, not search result links.",
  "Prefer listings with clear responsibilities and required skills.",
  "Regenerate for each role instead of reusing one version.",
] as const;

const SAMPLE_URLS = [
  "https://www.linkedin.com/jobs/view/...",
  "https://www.naukri.com/job-listings-...",
  "https://company.com/careers/software-engineer",
] as const;

function PulsingDot() {
  return <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent)]" aria-hidden="true" />;
}

type GenerationInsights = {
  jobUrl: string;
  jdTitle: string;
  jdExcerpt: string | null;
  atsScore: number | null;
  matchedTags: string[];
};

function insightsFromJobUrl(jobUrl: string): GenerationInsights {
  return {
    jobUrl,
    jdTitle: inferJdTitleFromJobUrl(jobUrl),
    jdExcerpt: null,
    atsScore: null,
    matchedTags: extractTagsFromJobUrl(jobUrl),
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [jobUrl, setJobUrl] = useState("");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [statusIndex, setStatusIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [insights, setInsights] = useState<GenerationInsights | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const pendingRequestControllerRef = useRef<AbortController | null>(null);
  const autoCancelTimeoutRef = useRef<number | null>(null);

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
    if (generationState !== "processing") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % PROCESSING_MESSAGES.length);
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [generationState]);

  useEffect(() => {
    if (!generationId) {
      return;
    }

    const channel = supabase
      .channel(`generation:${generationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generations",
          filter: `id=eq.${generationId}`,
        },
        (payload) => {
          const row = payload.new as {
            status?: string | null;
            download_url?: string | null;
            job_url?: string | null;
            jd_url?: string | null;
            jd_title?: string | null;
            jd_excerpt?: string | null;
            ats_score?: number | null;
            matched_tags?: string[] | null;
          };

          const bestJobUrl = row.jd_url?.trim() || row.job_url?.trim() || insights?.jobUrl || "";
          if (bestJobUrl) {
            setInsights({
              jobUrl: bestJobUrl,
              jdTitle: row.jd_title?.trim() || inferJdTitleFromJobUrl(bestJobUrl),
              jdExcerpt: row.jd_excerpt?.trim() || null,
              atsScore: typeof row.ats_score === "number" ? row.ats_score : null,
              matchedTags: Array.isArray(row.matched_tags) ? row.matched_tags.filter(Boolean).slice(0, 12) : extractTagsFromJobUrl(bestJobUrl),
            });
          }

          if (row.status === "completed") {
            setDownloadUrl(row.download_url ?? null);
            setGenerationState("completed");
            setErrorMessage("");
            setGenerationId(null);
            return;
          }

          if (row.status === "error") {
            setGenerationState("error");
            setErrorMessage("Resume generation failed. Please try again.");
            setGenerationId(null);
            return;
          }

          if (row.status === "cancelled") {
            setGenerationState("cancelled");
            setErrorMessage("");
            setGenerationId(null);
          }
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setGenerationState("error");
          setErrorMessage("Realtime connection failed. Please try again.");
          setGenerationId(null);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [generationId, insights?.jobUrl, supabase]);

  useEffect(() => {
    return () => {
      pendingRequestControllerRef.current?.abort();
      if (autoCancelTimeoutRef.current) {
        window.clearTimeout(autoCancelTimeoutRef.current);
      }
    };
  }, []);

  const handleDownload = () => {
    if (!downloadUrl) {
      setGenerationState("error");
      setErrorMessage("Download URL is missing. Please generate again.");
      return;
    }

    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!jobUrl.trim()) {
      setGenerationState("error");
      setErrorMessage("Please enter a job URL to continue.");
      return;
    }

    if (!isValidHttpUrl(jobUrl)) {
      setGenerationState("error");
      setErrorMessage("Please enter a valid job URL starting with http:// or https://.");
      return;
    }

    pendingRequestControllerRef.current?.abort();
    const requestController = new AbortController();
    pendingRequestControllerRef.current = requestController;

    try {
      const settingsResponse = await fetch("/api/user/settings", {
        signal: requestController.signal,
      });
      if (!settingsResponse.ok) {
        throw new Error("Unable to verify your account settings right now.");
      }

      const settingsData = (await settingsResponse.json()) as {
        has_claude_api_key?: boolean;
        base_resume_url?: string | null;
      };

      if (!settingsData.base_resume_url) {
        setGenerationState("error");
        setErrorMessage("Please upload a base resume in Settings before generating.");
        return;
      }

      if (!settingsData.has_claude_api_key) {
        setGenerationState("error");
        setErrorMessage("Please add your Gemini API key in Settings before generating.");
        return;
      }

      const generateResponse = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_url: jobUrl.trim() }),
        signal: requestController.signal,
      });

      if (!generateResponse.ok) {
        const body = (await generateResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to start resume generation.");
      }

      const body = (await generateResponse.json()) as { generation_id?: string };
      if (!body.generation_id) {
        throw new Error("Generation ID missing from /api/generate response.");
      }

      setDownloadUrl(null);
      setErrorMessage("");
      setInsights(insightsFromJobUrl(jobUrl.trim()));
      setGenerationState("processing");
      setStatusIndex(0);
      setGenerationId(body.generation_id);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setGenerationState("error");
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while generating your resume. Please try again.";
      setErrorMessage(message);
    } finally {
      if (pendingRequestControllerRef.current === requestController) {
        pendingRequestControllerRef.current = null;
      }
    }
  };

  const handleCancelGeneration = useCallback(async (options?: { preserveMessage?: boolean }) => {
    if (generationState !== "processing") {
      return;
    }

    setIsCancelling(true);
    pendingRequestControllerRef.current?.abort();
    pendingRequestControllerRef.current = null;

    const activeGenerationId = generationId;

    try {
      if (activeGenerationId) {
        const cancelResponse = await fetch("/api/generate/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ generation_id: activeGenerationId }),
        });

        if (!cancelResponse.ok) {
          const body = (await cancelResponse.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error || "Failed to cancel generation.");
        }
      }

      setGenerationState("cancelled");
      if (!options?.preserveMessage) {
        setErrorMessage("");
      }
      setGenerationId(null);
      setStatusIndex(0);
    } catch (error) {
      setGenerationState("error");
      const message = error instanceof Error ? error.message : "Failed to cancel generation.";
      setErrorMessage(message);
    } finally {
      setIsCancelling(false);
    }
  }, [generationId, generationState]);

  useEffect(() => {
    if (generationState !== "processing") {
      if (autoCancelTimeoutRef.current) {
        window.clearTimeout(autoCancelTimeoutRef.current);
        autoCancelTimeoutRef.current = null;
      }
      return;
    }

    autoCancelTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage("Generation timed out after 1 minute 30 seconds and was cancelled automatically.");
      void handleCancelGeneration({ preserveMessage: true });
    }, AUTO_CANCEL_TIMEOUT_MS);

    return () => {
      if (autoCancelTimeoutRef.current) {
        window.clearTimeout(autoCancelTimeoutRef.current);
        autoCancelTimeoutRef.current = null;
      }
    };
  }, [generationState, handleCancelGeneration]);

  if (isCheckingAuth) {
    return <main className="app-shell-bg min-h-screen" />;
  }

  return (
    <main className="app-shell-bg min-h-screen px-3 pb-8 pt-44 sm:px-6 md:pt-32">
      <AppShellHeader />
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="grid gap-6 lg:grid-cols-[1.55fr_0.95fr]">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(160deg,rgba(19,23,33,0.88)_0%,rgba(9,12,19,0.9)_65%,rgba(7,9,14,0.95)_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-7">
              <div className="pointer-events-none absolute -right-16 -top-14 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(141,180,255,0.25)_0%,_rgba(141,180,255,0)_72%)]" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-60 w-60 rounded-full bg-[radial-gradient(circle,_rgba(112,221,255,0.18)_0%,_rgba(112,221,255,0)_70%)]" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--accent-2)]" />
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-2)]">
                        Tailark AI Workspace
                      </p>
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                      Resume Studio
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                      Job URL in, AI-optimized resume out. Built for fast iterations and stronger role-fit.
                    </p>
                  </div>
                  <div className="grid min-w-[220px] grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        <Gauge className="h-3 w-3" /> Match
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">+20%</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        <Clock3 className="h-3 w-3" /> Avg
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">52s</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        <FileText className="h-3 w-3" /> Export
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">PDF</p>
                    </div>
                  </div>
                </div>

                <form className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4" onSubmit={handleGenerate}>
                  <label htmlFor="job-url" className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Link2 className="h-4 w-4" />
                    Job URL
                  </label>
                  <Input
                    id="job-url"
                    type="url"
                    placeholder="https://company.com/careers/role"
                    value={jobUrl}
                    onChange={(event) => setJobUrl(event.target.value)}
                    className="h-12 rounded-xl border-white/15 bg-black/30 px-4 py-3"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={generationState === "processing" || isCancelling}
                      className="h-12 flex-1 rounded-xl py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {generationState === "processing" ? "Generating..." : "Generate Tailored Resume"}
                    </Button>
                    <Link href="/settings" className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-xl px-5")}>
                      Update Keys / Resume
                    </Link>
                  </div>
                </form>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {["Parse JD", "Rewrite Experience", "Compile PDF"].map((step, index) => (
                    <div key={step} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Step {index + 1}</p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {generationState === "processing" ? (
              <div className="glass-card relative overflow-hidden p-6">
                <div className="absolute left-0 top-0 h-[2px] w-full overflow-hidden bg-[rgba(121,163,255,0.18)]">
                  <div className="h-full w-1/3 animate-[progressSlide_1.8s_ease-in-out_infinite] bg-[var(--accent)]" />
                </div>
                <div className="flex items-center gap-3 pt-2 text-[var(--text-primary)]">
                  <PulsingDot />
                  <p className="text-sm sm:text-base">{PROCESSING_MESSAGES[statusIndex]}</p>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Auto-cancels at 1:30 to prevent hanging runs.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleCancelGeneration();
                  }}
                  disabled={isCancelling}
                  className="mt-4 border-[rgba(242,139,139,0.45)] text-[var(--danger)] hover:bg-[rgba(242,139,139,0.12)]"
                >
                  {isCancelling ? "Cancelling..." : "Cancel generation"}
                </Button>
              </div>
            ) : null}

            {generationState === "completed" ? (
              <div className="glass-card glow-border border-[rgba(121,163,255,0.34)] p-8">
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Your resume is ready</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Download your role-specific PDF and apply while the role is fresh.
                </p>
                <Button
                  type="button"
                  onClick={handleDownload}
                  className="mt-6 h-14 w-full rounded-lg text-lg font-semibold shadow-[0_0_30px_rgba(121,163,255,0.24)] transition animate-pulse"
                >
                  Download PDF
                </Button>
              </div>
            ) : null}

            {generationState === "error" ? (
              <div className="glass-card border border-[rgba(242,139,139,0.45)] bg-[rgba(70,20,20,0.25)] p-4 text-sm text-[var(--danger)]">
                {errorMessage}
              </div>
            ) : null}

            {generationState === "cancelled" ? (
              <div className="glass-card border border-[rgba(180,180,200,0.35)] bg-[rgba(20,26,40,0.2)] p-4 text-sm text-[var(--text-secondary)]">
                {errorMessage || "Generation cancelled. You can start a new one anytime."}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="relative overflow-hidden p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Navigation</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Resume outputs and past runs are organized separately for fast scanning.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link href="/history" className={cn(buttonVariants({ size: "sm" }), "w-full justify-center sm:w-auto")}>
                    Open History
                  </Link>
                  <Link href="/generated" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center sm:w-auto")}>
                    Open Portfolio
                  </Link>
                </div>
              </Card>
              <Card className="p-6">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Sample URLs</p>
                <div className="mt-3 space-y-2">
                  {SAMPLE_URLS.map((url) => (
                    <div key={url} className="rounded-lg border border-[var(--border-glass)] bg-black/20 px-3 py-2 text-xs text-[var(--text-secondary)]">
                      {url}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-6">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--accent-2)]">Live Run Monitor</p>
              {generationState === "processing" ? (
                <div className="mt-3 space-y-3">
                  <div className="h-[2px] w-full overflow-hidden rounded bg-white/10">
                    <div className="h-full w-1/3 animate-[progressSlide_1.8s_ease-in-out_infinite] bg-[var(--accent)]" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <PulsingDot />
                    {PROCESSING_MESSAGES[statusIndex]}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleCancelGeneration();
                    }}
                    disabled={isCancelling}
                    className="w-full border-[rgba(242,139,139,0.45)] text-[var(--danger)] hover:bg-[rgba(242,139,139,0.12)]"
                  >
                    {isCancelling ? "Cancelling..." : "Cancel generation"}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">No active run. Submit a job URL to start.</p>
              )}

              {generationState === "completed" ? (
                <div className="mt-4 grid gap-2">
                  <Button type="button" onClick={handleDownload} className="h-11 w-full rounded-lg font-semibold">
                    Open Resume PDF
                  </Button>
                  {insights?.jobUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full rounded-lg"
                      onClick={() => window.open(insights.jobUrl, "_blank", "noopener,noreferrer")}
                    >
                      View Job Description
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {insights ? (
                <div className="mt-4 space-y-3 rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">JD Title</p>
                    <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{insights.jdTitle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">ATS Match</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                      {insights.atsScore !== null ? `${insights.atsScore}%` : generationState === "processing" ? "Calculating..." : "Not available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Matched Tags</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(insights.matchedTags.length > 0 ? insights.matchedTags : ["Role", "Skills"]).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {insights.jdExcerpt ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">JD Snapshot</p>
                      <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{insights.jdExcerpt}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {generationState === "error" ? (
                <div className="mt-4 rounded-lg border border-[rgba(242,139,139,0.45)] bg-[rgba(70,20,20,0.25)] p-3 text-sm text-[var(--danger)]">
                  {errorMessage}
                </div>
              ) : null}
              {generationState === "cancelled" ? (
                <div className="mt-4 rounded-lg border border-[rgba(180,180,200,0.35)] bg-[rgba(20,26,40,0.2)] p-3 text-sm text-[var(--text-secondary)]">
                  {errorMessage || "Generation cancelled. You can start a new one anytime."}
                </div>
              ) : null}
            </Card>

            <Card className="p-6">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--accent-2)]">Workflow Guide</p>
              <div className="mt-4 space-y-3">
                {EDUCATION_STEPS.map((step, idx) => (
                  <div key={step.title} className="rounded-xl border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {idx + 1}. {step.title}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{step.detail}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--accent-2)]">Pro Tips</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                {PRO_TIPS.map((tip) => (
                  <li key={tip} className="rounded-xl border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] px-3 py-2">
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

      </div>

      <style jsx>{`
        @keyframes progressSlide {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(320%);
          }
        }
      `}</style>
    </main>
  );
}
