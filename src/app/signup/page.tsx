"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace("/dashboard");
      }
    });

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
      setError("Password must be at least 8 characters and include letters and numbers.");
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

    setSuccessMessage("Signup successful. Please check your email to confirm your account, then log in.");
    setIsSubmitting(false);
  };

  return (
    <main className="app-shell-bg flex min-h-screen items-center justify-center px-6">
      <Card className="glow-border w-full max-w-[400px] p-8">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--text-secondary)]">RoleForge AI</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--accent)]">Create account</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm text-[var(--text-secondary)]" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-[var(--text-secondary)]" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-[var(--text-secondary)]" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11 rounded-lg px-4 py-3"
            />
          </div>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {successMessage ? <p className="text-sm text-[var(--accent)]">{successMessage}</p> : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg py-3 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link className="font-medium text-[var(--accent)] hover:text-[var(--accent-dim)]" href="/login">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
