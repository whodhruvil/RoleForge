"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TailarkLogo } from "@/components/ui/tailark-logo";
import { isStrongPassword, isValidEmail } from "@/lib/validation";
import { createClient } from "../../../lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace("/dashboard");
      }
    };

    const handlePageShow = () => {
      void checkSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          router.replace("/dashboard");
        }
      }
    );

    void checkSession();
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError(
        "Password must be at least 8 characters and include letters and numbers."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      return;
    }

    setSuccessMessage(
      "Signup successful. Please check your email to confirm your account, then log in."
    );
    setIsSubmitting(false);
  };

  return (
    <main className='app-shell-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10'>
      <div className='pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl' />
      <div className='pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-zinc-300/10 blur-3xl' />

      <div className='grid w-full max-w-5xl items-stretch gap-5 lg:grid-cols-[1.05fr_0.95fr]'>
        <Card className='hidden p-8 lg:block'>
          <div className='rounded-xl border border-white/10 bg-black/20 p-6'>
            <TailarkLogo className='h-7' />
            <p className='mt-5 text-3xl font-semibold leading-tight text-[var(--text-primary)]'>
              Create your Tailark account
            </p>
            <p className='mt-3 text-sm leading-7 text-[var(--text-secondary)]'>
              Start generating AI-tailored resumes with job URL parsing,
              role-fit rewriting, and export-ready outputs.
            </p>
            <div className='mt-6 grid gap-2'>
              {[
                "Secure account setup",
                "Upload base resume",
                "Generate by job URL",
                "Track history and results",
              ].map((item) => (
                <div
                  key={item}
                  className='rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[var(--text-primary)]'
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className='glow-border w-full p-8'>
          <div className='mb-5'>
            <Link
              href='/'
              className='inline-flex items-center rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] transition hover:border-white/30 hover:text-[var(--text-primary)]'
            >
              ← Back to Home
            </Link>
          </div>
          <div className='mb-8 text-center'>
            <div className='flex justify-center'>
              <TailarkLogo className='h-6' />
            </div>
            <h1 className='mt-3 text-3xl font-semibold text-[var(--text-primary)]'>
              Create your account
            </h1>
          </div>

          <form className='space-y-4' onSubmit={handleSubmit}>
            <div>
              <label
                className='mb-2 block text-sm text-[var(--text-secondary)]'
                htmlFor='email'
              >
                Email
              </label>
              <Input
                id='email'
                type='email'
                autoComplete='email'
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className='h-11 rounded-lg px-4 py-3'
              />
            </div>

            <div>
              <label
                className='mb-2 block text-sm text-[var(--text-secondary)]'
                htmlFor='password'
              >
                Password
              </label>
              <Input
                id='password'
                type='password'
                autoComplete='new-password'
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className='h-11 rounded-lg px-4 py-3'
              />
            </div>

            <div>
              <label
                className='mb-2 block text-sm text-[var(--text-secondary)]'
                htmlFor='confirmPassword'
              >
                Confirm Password
              </label>
              <Input
                id='confirmPassword'
                type='password'
                autoComplete='new-password'
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className='h-11 rounded-lg px-4 py-3'
              />
            </div>

            {error ? (
              <p className='rounded-lg border border-red-300/25 bg-red-400/10 px-3 py-2 text-sm text-red-200'>
                {error}
              </p>
            ) : null}
            {successMessage ? (
              <p className='rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200'>
                {successMessage}
              </p>
            ) : null}

            <Button
              type='submit'
              disabled={isSubmitting}
              className='w-full rounded-lg py-3 disabled:cursor-not-allowed disabled:opacity-70'
            >
              {isSubmitting ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>

          <p className='mt-6 text-center text-sm text-[var(--text-secondary)]'>
            Already have an account?{" "}
            <Link
              className='font-semibold text-[var(--text-primary)] underline underline-offset-4 hover:opacity-85'
              href='/login'
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
