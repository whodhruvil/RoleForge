"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShellHeader from "@/components/AppShellHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isLikelyClaudeApiKey, MAX_RESUME_FILE_BYTES } from "@/lib/validation";
import { createClient } from "../../../lib/supabase/client";

type ToastState = {
  message: string;
  visible: boolean;
};

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
        <path d="M3 3l18 18" />
        <path d="M10.58 10.58a2 2 0 102.83 2.83" />
        <path d="M9.88 5.09A9.77 9.77 0 0112 4c6 0 10 8 10 8a16.12 16.12 0 01-4.63 5.44" />
        <path d="M6.61 6.61A15.47 15.47 0 002 12s4 8 10 8a9.77 9.77 0 004.91-1.32" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
      <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current" strokeWidth="1.8">
      <path d="M12 16V6" />
      <path d="M8 10l4-4 4 4" />
      <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[var(--accent)]" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const [savedResumeUrl, setSavedResumeUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getFileNameFromUrl = (value: string | null) => {
    if (!value) {
      return null;
    }
    try {
      const pathname = new URL(value).pathname;
      const raw = pathname.split("/").pop() ?? "";
      return decodeURIComponent(raw) || null;
    } catch {
      return null;
    }
  };

  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const response = await fetch("/api/user/settings");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        api_key?: string;
        has_api_key?: boolean;
        has_claude_api_key?: boolean;
        base_resume_url?: string | null;
      };

      const loadedApiKey = (data.api_key ?? "").trim();
      setClaudeApiKey(loadedApiKey);
      setHasSavedApiKey(Boolean(data.has_api_key ?? data.has_claude_api_key ?? loadedApiKey));
      setSavedResumeUrl(data.base_resume_url ?? null);
      if (data.base_resume_url) {
        const fileName = getFileNameFromUrl(data.base_resume_url);
        if (fileName) {
          setSelectedFileName(fileName);
        }
      }
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

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
      await loadSettings();
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
  }, [loadSettings, router, supabase]);

  const showSuccessToast = (message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(() => {
      setToast({ message: "", visible: false });
    }, 2600);
  };

  const saveUserSettings = async (payload: Record<string, string>) => {
    const response = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "Failed to save settings.");
    }
  };

  const handleApiKeySave = async () => {
    try {
      const normalizedKey = claudeApiKey.trim();
      if (!normalizedKey) {
        setApiKeyError("Please enter your Gemini API key.");
        return;
      }
      if (!isLikelyClaudeApiKey(normalizedKey)) {
        setApiKeyError("Please enter a valid Gemini API key (starts with AIza, gsk_, or sk-).");
        return;
      }

      setApiKeyError(null);
      setError(null);
      setSettingsSaving(true);
      await saveUserSettings({ claudeApiKey: normalizedKey });
      setHasSavedApiKey(true);
      setClaudeApiKey(normalizedKey);
      showSuccessToast("API key saved successfully.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save API key.";
      setApiKeyError(message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const uploadAndSaveResume = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a .pdf file.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }

    if (file.size <= 0) {
      setError("Selected file is empty.");
      return;
    }

    if (file.size > MAX_RESUME_FILE_BYTES) {
      setError("File is too large. Maximum allowed size is 5MB.");
      return;
    }

    try {
      setError(null);
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const body = (await uploadResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Failed to upload resume.");
      }

      const uploadBody = (await uploadResponse.json()) as {
        url?: string;
        resumeUrl?: string;
        downloadUrl?: string;
        signedUrl?: string;
      };

      const uploadedUrl = uploadBody.url || uploadBody.resumeUrl || uploadBody.downloadUrl || uploadBody.signedUrl;
      if (!uploadedUrl) {
        throw new Error("Upload did not return a resume URL.");
      }

      await saveUserSettings({ baseResumeUrl: uploadedUrl });
      setSelectedFileName(file.name);
      setSavedResumeUrl(uploadedUrl);
      showSuccessToast("Base resume saved successfully.");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload resume.";
      setError(message);
    } finally {
      setUploading(false);
      setIsDragging(false);
    }
  };

  const handleFilePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await uploadAndSaveResume(file);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];

    if (!file) {
      setIsDragging(false);
      return;
    }

    await uploadAndSaveResume(file);
  };

  const handleViewBaseResume = () => {
    if (!savedResumeUrl) {
      setError("Base resume URL is missing.");
      return;
    }
    window.open(savedResumeUrl, "_blank", "noopener,noreferrer");
  };

  if (isCheckingAuth) {
    return <main className="app-shell-bg min-h-screen" />;
  }

  return (
    <main className="app-shell-bg min-h-screen px-3 pb-8 pt-44 sm:px-6 md:pt-32">
      <AppShellHeader subtitle="Account & Workspace Config" />
      <div className="mx-auto w-full max-w-6xl space-y-7">
        <section className="space-y-6">
          <Card className="glow-border relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,_rgba(121,163,255,0.16)_0%,_rgba(121,163,255,0)_70%)]" />
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Gemini API Key</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Securely store your Gemini API key. It is used server-side for generation only.
            </p>
            {isLoadingSettings ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">Loading saved settings...</p>
            ) : null}
            {hasSavedApiKey ? (
              <p className="mt-2 text-xs text-[var(--accent)]">API key already added.</p>
            ) : null}

            <div className="mt-4">
              <label className="mb-2 block text-sm text-[var(--text-secondary)]" htmlFor="claude-api-key">
                API Key
              </label>

              <div className="flex gap-2">
                <Input
                  id="claude-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={claudeApiKey}
                  onChange={(event) => {
                    setClaudeApiKey(event.target.value);
                    setApiKeyError(null);
                  }}
                  placeholder="AIza..."
                  className="h-11 rounded-lg px-4 py-3"
                />
              <Button
                type="button"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
                onClick={() => setShowApiKey((current) => !current)}
                variant="outline"
                className="rounded-lg px-3 transition hover:text-[var(--text-primary)]"
              >
                <EyeIcon hidden={!showApiKey} />
              </Button>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleApiKeySave}
              disabled={settingsSaving || !claudeApiKey.trim()}
              className="mt-4 h-11 rounded-lg px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {settingsSaving ? "Saving..." : hasSavedApiKey ? "Update API Key" : "Save API Key"}
            </Button>
            {apiKeyError ? <p className="mt-2 text-sm text-[var(--danger)]">{apiKeyError}</p> : null}
            {hasSavedApiKey ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                API key is saved securely. Enter a new key above to update it.
              </p>
            ) : null}
          </Card>

          <Card className="glow-border relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,_rgba(65,216,246,0.14)_0%,_rgba(65,216,246,0)_70%)]" />
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Base Resume</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Upload a single source resume. This file is used to generate role-specific versions.
            </p>
            {savedResumeUrl ? (
              <p className="mt-2 text-xs text-[var(--accent)]">A base resume is already saved for your account.</p>
            ) : null}
            {savedResumeUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleViewBaseResume}
                className="mt-3 h-10 rounded-lg px-4"
              >
                View Base Resume
              </Button>
            ) : null}

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className="mt-4 cursor-pointer rounded-xl border border-dashed p-8 text-center transition"
              style={{
                borderColor: isDragging ? "var(--accent)" : "rgba(121,163,255,0.32)",
                background: isDragging ? "rgba(121,163,255,0.09)" : "rgba(10,14,26,0.62)",
              }}
            >
              <div className="mx-auto mb-3 w-fit text-[var(--text-secondary)]">
                <UploadIcon />
              </div>
              <p className="text-sm text-[var(--text-primary)]">Drop your PDF here or click to browse</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">PDF only</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFilePick}
              />
            </div>

            {selectedFileName ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <CheckIcon />
                <span>{selectedFileName}</span>
              </div>
            ) : null}

            {uploading ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Uploading resume...</p> : null}
          </Card>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </section>
      </div>

      {toast.visible ? (
        <div className="fixed right-5 top-5 z-50 rounded-lg border border-[rgba(121,163,255,0.42)] bg-[rgba(15,23,40,0.94)] px-4 py-3 text-sm font-medium text-[var(--accent)] shadow-[0_10px_30px_rgba(0,0,0,0.32)]">
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}
