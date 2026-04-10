"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FileText, Link2 } from "lucide-react";
import AppShellHeader from "@/components/AppShellHeader";
import { Button } from "@/components/ui/button";
import { getDisplayCompanyName } from "@/lib/job";
import { createClient } from "../../../../lib/supabase/client";

type GenerationDetail = {
  id: string;
  job_url: string;
  jd_url: string | null;
  jd_title: string | null;
  jd_excerpt: string | null;
  ats_score: number | null;
  matched_tags: string[] | null;
  matched_skills: string[] | null;
  new_skills_added: string[] | null;
  resume_changes: string[] | null;
  resume_before_summary: string | null;
  resume_after_summary: string | null;
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

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.replace("/login");
        }
      }
    );

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
    return <main className='app-shell-bg min-h-screen' />;
  }

  const companyName = getDisplayCompanyName(
    row?.company_name,
    row?.job_url ?? null
  );
  const jobDescriptionUrl = row?.jd_url?.trim() || row?.job_url;
  const matchedSkills = row?.matched_skills?.length
    ? row.matched_skills
    : row?.matched_tags?.length
    ? row.matched_tags
    : ["React", "TypeScript"];
  const newSkillsAdded = row?.new_skills_added?.length
    ? row.new_skills_added
    : [];
  const resumeChanges = row?.resume_changes?.length ? row.resume_changes : [];

  return (
    <main className='app-shell-bg min-h-screen px-3 pb-8 pt-44 sm:px-6 md:pt-32'>
      <AppShellHeader subtitle='Resume Output' />
      <div className='mx-auto w-full max-w-6xl space-y-6'>
        {loading ? (
          <p className='text-sm text-[var(--text-secondary)]'>
            Loading generated resume...
          </p>
        ) : null}
        {error ? <p className='text-sm text-[var(--danger)]'>{error}</p> : null}

        {!loading && !error && row ? (
          <div className='space-y-5'>
            <section className='rounded-3xl border border-white/15 bg-[linear-gradient(160deg,rgba(19,23,33,0.9)_0%,rgba(10,13,20,0.92)_70%,rgba(8,10,15,0.95)_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                <div className='max-w-4xl'>
                  <div className='flex flex-wrap items-center gap-3'>
                    <button
                      type='button'
                      onClick={() => router.push("/generated")}
                      className='inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'
                    >
                      ← Back
                    </button>
                    <span className='rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.08em] text-emerald-200'>
                      {row.status}
                    </span>
                  </div>

                  <p className='mt-5 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]'>
                    Company Label From JD URL
                  </p>
                  <h1 className='mt-2 text-4xl font-semibold tracking-tight text-[var(--text-primary)]'>
                    {companyName}
                  </h1>
                  <p className='mt-3 break-all text-sm text-[var(--text-secondary)]'>
                    {row.job_url}
                  </p>
                </div>

                <div className='flex shrink-0 flex-col items-end gap-3'>
                  <p className='text-right text-[11px] text-[var(--text-muted)]'>
                    {row.created_at ?? "Created recently"}
                  </p>
                  {row.status === "completed" && row.download_url ? (
                    <div className='flex items-center gap-1'>
                      <Button
                        onClick={() =>
                          window.open(
                            row.download_url!,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        size='icon'
                        title='Open Resume PDF'
                        aria-label='Open Resume PDF'
                        variant='ghost'
                        className='h-9 w-9 rounded-full border-0 bg-transparent text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                      >
                        <FileText className='h-4 w-4' />
                      </Button>
                      {jobDescriptionUrl ? (
                        <a
                          href={jobDescriptionUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex'
                        >
                          <Button
                            size='icon'
                            title='View Job Description'
                            aria-label='View Job Description'
                            variant='ghost'
                            className='h-9 w-9 rounded-full border-0 bg-transparent text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                          >
                            <Link2 className='h-4 w-4' />
                          </Button>
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className='mt-3 text-right text-sm text-[var(--text-secondary)]'>
                      PDF is not available yet for this generation.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className='grid gap-4 lg:grid-cols-3'>
              <div className='space-y-4 lg:col-span-2'>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='rounded-xl border border-[var(--border-glass)] bg-black/20 px-4 py-3'>
                    <p className='text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                      ATS Match
                    </p>
                    <p className='mt-1 text-sm font-medium text-[var(--text-primary)]'>
                      {typeof row.ats_score === "number"
                        ? `${row.ats_score}%`
                        : "Not available"}
                    </p>
                  </div>
                  <div className='rounded-xl border border-[var(--border-glass)] bg-black/20 px-4 py-3'>
                    <p className='text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                      JD Title
                    </p>
                    <p className='mt-1 text-sm font-medium text-[var(--text-primary)]'>
                      {row.jd_title?.trim() || "Job Description"}
                    </p>
                  </div>
                  <div className='rounded-xl border border-[var(--border-glass)] bg-black/20 px-4 py-3 sm:col-span-2'>
                    <p className='text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                      Generation ID
                    </p>
                    <p className='mt-1 break-all text-sm text-[var(--text-primary)]'>
                      {row.id}
                    </p>
                  </div>
                </div>

                <div className='rounded-xl border border-[var(--border-glass)] bg-black/20 px-4 py-3'>
                  <p className='text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                    Matched Skills
                  </p>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className='rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100'
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className='rounded-xl border border-[var(--border-glass)] bg-black/20 px-4 py-3'>
                  <p className='text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                    New Skills Added
                  </p>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {(newSkillsAdded.length > 0
                      ? newSkillsAdded
                      : ["No explicit new skills reported"]
                    ).map((skill) => (
                      <span
                        key={skill}
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          newSkillsAdded.length > 0
                            ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                            : "border-white/15 bg-white/[0.06] text-[var(--text-secondary)]"
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                {row.jd_excerpt ? (
                  <div className='rounded-xl border border-[var(--border-glass)] bg-black/20 px-4 py-3'>
                    <p className='text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                      JD Snapshot
                    </p>
                    <p className='mt-2 text-sm leading-7 text-[var(--text-secondary)]'>
                      {row.jd_excerpt}
                    </p>
                  </div>
                ) : (
                  <div className='rounded-xl border border-[var(--border-glass)] bg-black/20 px-4 py-3'>
                    <p className='text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                      JD Snapshot
                    </p>
                    <p className='mt-2 text-sm text-[var(--text-secondary)]'>
                      JD snapshot not available for this run.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className='rounded-2xl border border-[var(--border-glass)] bg-black/20 px-4 py-4'>
              <p className='text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                What Changed In Resume
              </p>
              <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                <div className='rounded-lg border border-white/10 bg-white/[0.04] p-3'>
                  <p className='text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                    Before
                  </p>
                  <p className='mt-2 text-sm leading-6 text-[var(--text-secondary)]'>
                    {row.resume_before_summary?.trim() ||
                      "Base resume without role-specific optimization."}
                  </p>
                </div>
                <div className='rounded-lg border border-white/10 bg-white/[0.04] p-3'>
                  <p className='text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                    After
                  </p>
                  <p className='mt-2 text-sm leading-6 text-[var(--text-secondary)]'>
                    {row.resume_after_summary?.trim() ||
                      "Role-tailored resume with stronger keyword and impact alignment."}
                  </p>
                </div>
              </div>
              <div className='mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3'>
                <p className='text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]'>
                  Change Log
                </p>
                <ul className='mt-2 space-y-1 text-sm text-[var(--text-secondary)]'>
                  {(resumeChanges.length > 0
                    ? resumeChanges
                    : [
                        "Reordered bullet points by role relevance.",
                        "Added stronger action verbs and measurable outcomes.",
                        "Aligned keywords with job description requirements.",
                      ]
                  ).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
