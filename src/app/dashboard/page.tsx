"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import AppShellHeader from "@/components/AppShellHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [jobUrl, setJobUrl] = useState("");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [statusIndex, setStatusIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
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
          };

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
  }, [generationId, supabase]);

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
    <main className="app-shell-bg min-h-screen px-6 pb-8 pt-32">
      <AppShellHeader />
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <Card className="glow-border relative overflow-hidden p-7 sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(65,216,246,0.2)_0%,_rgba(65,216,246,0)_70%)]" />
              <div className="pointer-events-none absolute -bottom-10 -left-6 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(121,163,255,0.2)_0%,_rgba(121,163,255,0)_70%)]" />
              <p className="inline-flex rounded-full border border-[var(--border-glass)] bg-[rgba(121,163,255,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-2)]">
                Guided Generation
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Generate a tailored resume users actually want to send
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                Paste one job listing and RoleForge AI rewrites your base resume to match required skills, impact language,
                and recruiter intent. Start with a precise role to get stronger fit.
              </p>

              <form className="mt-6 space-y-3" onSubmit={handleGenerate}>
                <label htmlFor="job-url" className="block text-sm text-[var(--text-secondary)]">
                  Job URL
                </label>
                <Input
                  id="job-url"
                  type="url"
                  placeholder="https://company.com/careers/role"
                  value={jobUrl}
                  onChange={(event) => setJobUrl(event.target.value)}
                  className="h-12 rounded-lg px-4 py-3"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={generationState === "processing" || isCancelling}
                    className="h-12 flex-1 rounded-lg py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {generationState === "processing" ? "Generating..." : "Generate Tailored Resume"}
                  </Button>
                  <Link href="/settings" className={cn(buttonVariants({ variant: "outline" }), "h-12 px-5")}>
                    Update Keys / Resume
                  </Link>
                </div>
              </form>

              <div className="mt-6 rounded-xl border border-[var(--border-glass)] bg-[rgba(8,12,23,0.7)] p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Sample URLs</p>
                <div className="mt-2 space-y-1">
                  {SAMPLE_URLS.map((url) => (
                    <p key={url} className="truncate text-xs text-[var(--text-secondary)]">{url}</p>
                  ))}
                </div>
              </div>
            </Card>

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

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Generation Archive</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                Browse all previous generations on a separate History page. Open completed entries to see the dedicated
                resume page labeled by company name from the JD URL.
              </p>
              <Link href="/history" className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex")}>
                Open History Page
              </Link>
              <Link href="/generated" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 inline-flex")}>
                Open Generated Resumes
              </Link>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-6">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--accent-2)]">How To Win More Interviews</p>
              <div className="mt-4 space-y-3">
                {EDUCATION_STEPS.map((step, idx) => (
                  <div key={step.title} className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-3">
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
                  <li key={tip} className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] px-3 py-2">
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--accent-2)]">Session Readiness</p>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                <p className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] px-3 py-2">
                  1. API key saved in Settings.
                </p>
                <p className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] px-3 py-2">
                  2. Base resume PDF uploaded.
                </p>
                <p className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] px-3 py-2">
                  3. Job link contains clear requirements.
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">What Happens Behind The Scenes</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                RoleForge AI parses the listing, aligns your base profile to demand signals, and compiles a polished
                output. You stay in control with live status, cancel support, and historical downloads.
              </p>
              <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                <div className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Parsing</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-primary)]">Role intent extraction</p>
                </div>
                <div className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Rewriting</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-primary)]">Experience fit optimization</p>
                </div>
                <div className="rounded-lg border border-[var(--border-glass)] bg-[rgba(8,12,23,0.72)] p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Delivery</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-primary)]">PDF compile and export</p>
                </div>
              </div>
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
