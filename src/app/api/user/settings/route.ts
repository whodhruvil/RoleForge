import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isLikelyClaudeApiKey, isValidHttpUrl } from "@/lib/validation";
import { createClient } from "../../../../../lib/supabase/server";

type SettingsBody = {
  claude_api_key?: string;
  base_resume_url?: string;
  claudeApiKey?: string;
  baseResumeUrl?: string;
};

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, supabase };
  }

  return { user, supabase };
}

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Server misconfiguration: missing Supabase service role credentials.");
  }

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET() {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const admin = createServiceRoleClient();

    const { data, error } = await admin
      .from("users")
      .select("id, claude_api_key, base_resume_url, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to fetch settings." }, { status: 500 });
    }

    return NextResponse.json({
      id: data?.id ?? user.id,
      api_key: data?.claude_api_key ?? "",
      has_api_key: Boolean(data?.claude_api_key),
      has_claude_api_key: Boolean(data?.claude_api_key),
      base_resume_url: data?.base_resume_url ?? null,
      created_at: data?.created_at ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Unexpected error while fetching settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const admin = createServiceRoleClient();

    const body = (await request.json().catch(() => null)) as SettingsBody | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const claudeApiKey = body.claude_api_key ?? body.claudeApiKey;
    const baseResumeUrl = body.base_resume_url ?? body.baseResumeUrl;

    if (claudeApiKey === undefined && baseResumeUrl === undefined) {
      return NextResponse.json(
        { error: "At least one setting field is required." },
        { status: 400 },
      );
    }

    const payload: {
      id: string;
      claude_api_key?: string;
      base_resume_url?: string;
    } = {
      id: user.id,
    };

    if (claudeApiKey !== undefined) {
      if (typeof claudeApiKey !== "string") {
        return NextResponse.json({ error: "claude_api_key must be a string." }, { status: 400 });
      }
      const normalizedKey = claudeApiKey.trim();
      if (!normalizedKey) {
        return NextResponse.json({ error: "claude_api_key cannot be empty." }, { status: 400 });
      }
      if (!isLikelyClaudeApiKey(normalizedKey)) {
        return NextResponse.json({ error: "Invalid claude_api_key format." }, { status: 400 });
      }
      payload.claude_api_key = normalizedKey;
    }

    if (baseResumeUrl !== undefined) {
      if (typeof baseResumeUrl !== "string") {
        return NextResponse.json({ error: "base_resume_url must be a string." }, { status: 400 });
      }
      const normalizedUrl = baseResumeUrl.trim();
      if (!isValidHttpUrl(normalizedUrl)) {
        return NextResponse.json({ error: "base_resume_url must be a valid URL." }, { status: 400 });
      }
      payload.base_resume_url = normalizedUrl;
    }

    const { data, error } = await admin
      .from("users")
      .upsert(payload, { onConflict: "id" })
      .select("id, claude_api_key, base_resume_url, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to save user settings." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: data.id,
      api_key: data.claude_api_key ?? "",
      has_api_key: Boolean(data.claude_api_key),
      has_claude_api_key: Boolean(data.claude_api_key),
      base_resume_url: data.base_resume_url,
      created_at: data.created_at,
    });
  } catch {
    return NextResponse.json({ error: "Unexpected error while saving settings." }, { status: 500 });
  }
}
