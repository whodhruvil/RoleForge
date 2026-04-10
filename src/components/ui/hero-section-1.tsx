"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Cpu,
  FlaskConical,
  GitBranch,
  HeartPulse,
  Leaf,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { TailarkLogo } from "@/components/ui/tailark-logo";
import { cn } from "@/lib/utils";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
} as const;

const customerIcons = [
  { name: "LinkedIn Jobs", Icon: Briefcase },
  { name: "Naukri", Icon: Sparkles },
  { name: "Greenhouse", Icon: Leaf },
  { name: "Lever", Icon: GitBranch },
  { name: "Career Pages", Icon: Cpu },
  { name: "ATS Ready", Icon: FlaskConical },
  { name: "Export PDF", Icon: HeartPulse },
  { name: "AI Assist", Icon: Sparkles },
];

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className='relative overflow-hidden'>
        <div
          aria-hidden
          className='z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block'
        >
          <div className='w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]' />
          <div className='h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]' />
          <div className='h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]' />
        </div>
        <section id='solution'>
          <div className='relative pt-24 md:pt-36'>
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: "spring",
                      bounce: 0.3,
                      duration: 2,
                    },
                  },
                },
              }}
              className='absolute inset-0 -z-20'
            >
              <img
                src='https://source.unsplash.com/3276x4095/?night,city,technology'
                alt='background'
                className='absolute inset-x-0 top-56 -z-20 hidden lg:top-32 dark:block'
                width='3276'
                height='4095'
              />
            </AnimatedGroup>
            <div
              aria-hidden
              className='absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]'
            />
            <div className='mx-auto max-w-7xl px-6'>
              <div className='text-center sm:mx-auto lg:mr-auto lg:mt-0'>
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href='#link'
                    className='hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300 dark:border-t-white/5 dark:shadow-zinc-950'
                  >
                    <span className='text-foreground text-sm'>
                      Built for AI-Powered Job-Targeted Resume Generation
                    </span>
                    <span className='dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700' />

                    <div className='bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500'>
                      <div className='flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0'>
                        <span className='flex size-6'>
                          <ArrowRight className='m-auto size-3' />
                        </span>
                        <span className='flex size-6'>
                          <ArrowRight className='m-auto size-3' />
                        </span>
                      </div>
                    </div>
                  </Link>

                  <h1 className='mt-8 max-w-5xl mx-auto text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem]'>
                    Build AI-Tailored Resumes From Any Job URL
                  </h1>
                  <p className='mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground'>
                    Tailark AI analyzes job descriptions, rewrites your resume
                    for role fit, and stores every generation in one place with
                    clean export-ready outputs.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className='mt-12 flex flex-col items-center justify-center gap-2 md:flex-row'
                >
                  <div
                    key={1}
                    className='bg-foreground/10 rounded-[14px] border p-0.5'
                  >
                    <Button
                      asChild
                      size='lg'
                      className='rounded-xl px-5 text-base'
                    >
                      <Link href='/signup'>
                        <span className='text-nowrap'>Generate My Resume</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size='lg'
                    variant='ghost'
                    className='h-10 rounded-xl px-5'
                  >
                    <Link href='/history'>
                      <span className='text-nowrap'>
                        View Generation History
                      </span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className='relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-16'>
                <div
                  aria-hidden
                  className='pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-background/95'
                />
                <div className='inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background/60 backdrop-blur-sm relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1'>
                  <div className='pointer-events-none absolute -bottom-20 left-[12%] z-0 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl' />
                  <div className='pointer-events-none absolute -bottom-16 right-[10%] z-0 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl' />

                  <div className='relative z-20 aspect-15/8 rounded-2xl border border-white/15 bg-[linear-gradient(160deg,#11131a_0%,#0b0d13_62%,#08090e_100%)] p-4 md:p-5'>
                    <div className='mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2'>
                      <div className='flex items-center gap-1.5'>
                        <span className='h-2.5 w-2.5 rounded-full bg-red-400/80' />
                        <span className='h-2.5 w-2.5 rounded-full bg-yellow-400/80' />
                        <span className='h-2.5 w-2.5 rounded-full bg-emerald-400/80' />
                      </div>
                      <p className='text-[10px] uppercase tracking-[0.12em] text-zinc-400'>
                        tailark.ai/workspace
                      </p>
                    </div>
                    <div className='grid h-full gap-3 md:grid-cols-[1.2fr_0.8fr]'>
                      <div className='flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 md:p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)]'>
                        <div className='flex items-center justify-between'>
                          <p className='text-xs uppercase tracking-[0.1em] text-zinc-300'>
                            Tailark AI Workspace
                          </p>
                          <span className='rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-200'>
                            Live
                          </span>
                        </div>
                        <div className='mt-3 rounded-lg border border-white/10 bg-black/20 p-3'>
                          <p className='text-[11px] text-zinc-400'>Job URL</p>
                          <p className='mt-1 truncate text-xs text-zinc-200'>
                            https://company.com/careers/senior-frontend-engineer
                          </p>
                        </div>
                        <div className='mt-3 grid gap-2 sm:grid-cols-3'>
                          <div className='rounded-lg border border-white/10 bg-white/[0.03] p-2'>
                            <p className='text-[10px] text-zinc-400'>
                              ATS Match
                            </p>
                            <p className='mt-1 text-sm font-semibold text-zinc-100'>
                              91%
                            </p>
                          </div>
                          <div className='rounded-lg border border-white/10 bg-white/[0.03] p-2'>
                            <p className='text-[10px] text-zinc-400'>
                              Completion
                            </p>
                            <p className='mt-1 text-sm font-semibold text-zinc-100'>
                              52s
                            </p>
                          </div>
                          <div className='rounded-lg border border-white/10 bg-white/[0.03] p-2'>
                            <p className='text-[10px] text-zinc-400'>Exports</p>
                            <p className='mt-1 text-sm font-semibold text-zinc-100'>
                              PDF + DOC
                            </p>
                          </div>
                        </div>
                        <div className='mt-3 space-y-2'>
                          <div className='h-2 w-full rounded-full bg-white/10'>
                            <div className='h-2 w-[72%] rounded-full bg-gradient-to-r from-cyan-400 to-violet-400' />
                          </div>
                          <p className='text-[11px] text-zinc-400'>
                            Generating role-aligned bullet points...
                          </p>
                        </div>
                        <div className='mt-3 grid flex-1 gap-2 sm:grid-cols-[1.15fr_0.85fr]'>
                          <div className='rounded-lg border border-white/10 bg-black/20 p-3'>
                            <p className='text-[10px] uppercase tracking-[0.1em] text-zinc-400'>
                              AI Rewrite Preview
                            </p>
                            <p className='mt-2 text-[11px] leading-5 text-zinc-300'>
                              Built an internal design system that reduced UI inconsistencies by 38% and improved
                              handoff speed across product squads.
                            </p>
                            <p className='mt-2 text-[11px] leading-5 text-zinc-300'>
                              Optimized rendering path and introduced caching strategies, cutting dashboard load time
                              from 2.8s to 1.4s.
                            </p>
                          </div>
                          <div className='space-y-2'>
                            <div className='rounded-lg border border-white/10 bg-black/20 p-3'>
                              <p className='text-[10px] uppercase tracking-[0.1em] text-zinc-400'>
                                Matched Skills
                              </p>
                              <div className='mt-2 flex flex-wrap gap-1.5'>
                                {['React', 'Next.js', 'TypeScript', 'Performance', 'Design Systems'].map((skill) => (
                                  <span
                                    key={skill}
                                    className='rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] text-zinc-200'
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className='rounded-lg border border-white/10 bg-black/20 p-3'>
                              <p className='text-[10px] uppercase tracking-[0.1em] text-zinc-400'>
                                Optimization
                              </p>
                              <ul className='mt-2 space-y-1 text-[10px] text-zinc-300'>
                                <li>Keyword density aligned</li>
                                <li>Quantified impact added</li>
                                <li>Tone tuned for role level</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className='flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 md:p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)]'>
                        <p className='text-xs uppercase tracking-[0.1em] text-zinc-300'>
                          Recent Generations
                        </p>
                        <div className='mt-3 space-y-2'>
                          <div className='rounded-lg border border-white/10 bg-black/20 p-2'>
                            <p className='text-xs text-zinc-100'>
                              Frontend Engineer - Stripe
                            </p>
                            <p className='text-[11px] text-zinc-400'>
                              Completed · 2m ago
                            </p>
                          </div>
                          <div className='rounded-lg border border-white/10 bg-black/20 p-2'>
                            <p className='text-xs text-zinc-100'>
                              Product Designer - Notion
                            </p>
                            <p className='text-[11px] text-zinc-400'>
                              Completed · 8m ago
                            </p>
                          </div>
                          <div className='rounded-lg border border-white/10 bg-black/20 p-2'>
                            <p className='text-xs text-zinc-100'>
                              Data Analyst - Ramp
                            </p>
                            <p className='text-[11px] text-zinc-400'>
                              In Progress · now
                            </p>
                          </div>
                        </div>
                        <div className='mt-3 rounded-lg border border-white/10 bg-black/20 p-2'>
                          <p className='text-[10px] uppercase tracking-[0.1em] text-zinc-400'>
                            Pipeline Status
                          </p>
                          <div className='mt-2 grid grid-cols-3 gap-1.5'>
                            <div className='rounded border border-emerald-300/30 bg-emerald-400/10 px-1.5 py-1 text-center text-[9px] text-emerald-200'>
                              Parsed
                            </div>
                            <div className='rounded border border-cyan-300/30 bg-cyan-400/10 px-1.5 py-1 text-center text-[9px] text-cyan-200'>
                              Rewriting
                            </div>
                            <div className='rounded border border-violet-300/30 bg-violet-400/10 px-1.5 py-1 text-center text-[9px] text-violet-200'>
                              Compile
                            </div>
                          </div>
                        </div>
                        <button
                          type='button'
                          className='mt-auto w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-zinc-100 transition hover:bg-white/[0.1]'
                        >
                          Open Resume Workspace
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className='relative z-30 -mt-14 grid gap-3 px-2 md:grid-cols-3 md:px-4'>
                    <div className='rounded-xl border border-cyan-300/25 bg-cyan-400/10 p-3 backdrop-blur-md'>
                      <p className='text-[10px] uppercase tracking-[0.1em] text-cyan-200/80'>
                        Role Parsing
                      </p>
                      <p className='mt-1 text-sm font-semibold text-cyan-100'>
                        Skills extracted from JD
                      </p>
                    </div>
                    <div className='rounded-xl border border-violet-300/25 bg-violet-400/10 p-3 backdrop-blur-md'>
                      <p className='text-[10px] uppercase tracking-[0.1em] text-violet-200/80'>
                        AI Rewrite
                      </p>
                      <p className='mt-1 text-sm font-semibold text-violet-100'>
                        Impact-focused bullet upgrades
                      </p>
                    </div>
                    <div className='rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3 backdrop-blur-md'>
                      <p className='text-[10px] uppercase tracking-[0.1em] text-emerald-200/80'>
                        Export
                      </p>
                      <p className='mt-1 text-sm font-semibold text-emerald-100'>
                        Ready PDF in one click
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
        <section
          id='how-it-works'
          className='bg-background pb-16 pt-6 md:pb-20'
        >
          <div className='mx-auto max-w-6xl px-6'>
            <AnimatedGroup variants={transitionVariants}>
              <div className='mx-auto max-w-3xl text-center'>
                <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
                  How It Works
                </p>
                <h2 className='mt-3 text-balance text-3xl font-semibold md:text-4xl'>
                  3 Steps To Generate A Job-Matched Resume With AI
                </h2>
                <p className='mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base'>
                  Tailark AI guides you from job link to final resume output
                  with clear progress, revision history, and export-ready
                  results.
                </p>
              </div>
            </AnimatedGroup>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.08,
                      delayChildren: 0.2,
                    },
                  },
                },
                ...transitionVariants,
              }}
              className='mt-10 grid gap-4 md:grid-cols-3'
            >
              <article className='rounded-2xl border bg-background/60 p-5 shadow-sm shadow-black/10'>
                <p className='text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
                  Step 1
                </p>
                <h3 className='mt-2 text-lg font-semibold'>Paste Job URL</h3>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                  Add any job posting link from LinkedIn, Naukri, Greenhouse,
                  Lever, or company career pages.
                </p>
              </article>
              <article className='rounded-2xl border bg-background/60 p-5 shadow-sm shadow-black/10'>
                <p className='text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
                  Step 2
                </p>
                <h3 className='mt-2 text-lg font-semibold'>
                  AI Rewrite & Match
                </h3>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                  Tailark AI extracts role requirements and rewrites your resume
                  content to align with hiring intent.
                </p>
              </article>
              <article className='rounded-2xl border bg-background/60 p-5 shadow-sm shadow-black/10'>
                <p className='text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
                  Step 3
                </p>
                <h3 className='mt-2 text-lg font-semibold'>Review & Export</h3>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                  Open your generated version, download the PDF, and track every
                  run inside generation history.
                </p>
              </article>
            </AnimatedGroup>
          </div>
        </section>
        <section
          id='integrations'
          className='bg-background/60 pb-16 pt-16 md:pb-32'
        >
          <div className='group relative m-auto max-w-5xl px-6'>
            <div className='absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100'>
              <Link
                href='/dashboard'
                className='block text-sm duration-150 hover:opacity-75'
              >
                <span>Open Resume Workspace</span>
                <ChevronRight className='ml-1 inline-block size-3' />
              </Link>
            </div>
            <div className='group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-8 transition-all duration-500 group-hover:opacity-50 sm:grid-cols-4 sm:gap-x-12 sm:gap-y-14'>
              {customerIcons.map(({ name, Icon }) => (
                <div
                  key={name}
                  className='flex items-center justify-center gap-2 text-muted-foreground'
                >
                  <Icon className='h-5 w-5' />
                  <span className='text-sm'>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const HeroHeader = () => {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav className='fixed z-20 w-full px-2'>
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5"
          )}
        >
          <div className='relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4'>
            <div className='flex w-full items-center justify-between'>
              <Link
                href='/'
                aria-label='home'
                className='flex items-center space-x-2'
              >
                <TailarkLogo />
              </Link>

              <div className='flex items-center gap-3'>
                <Button asChild variant='outline' size='sm'>
                  <Link href='/login'>
                    <span>Login</span>
                  </Link>
                </Button>
                <Button asChild size='sm'>
                  <Link href='/signup'>
                    <span>Sign Up</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
