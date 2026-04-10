import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getCompanyNameFromJobUrl } from "@/lib/company";
import { extractTagsFromJobUrl, inferJdTitleFromJobUrl } from "@/lib/job-intelligence";
import { isValidHttpUrl } from "@/lib/validation";
import { createClient } from "../../../../lib/supabase/server";

type GenerateBody = {
  job_url?: string;
};

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as GenerateBody | null;
    const jobUrl = body?.job_url?.trim();

    if (!jobUrl) {
      return NextResponse.json({ error: "job_url is required." }, { status: 400 });
    }

    if (!isValidHttpUrl(jobUrl)) {
      return NextResponse.json({ error: "job_url must be a valid http/https URL." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing Supabase service role credentials." },
        { status: 500 },
      );
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userSettings, error: settingsError } = await admin
      .from("users")
      .select("claude_api_key, base_resume_url")
      .eq("id", user.id)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json({ error: "Failed to fetch user settings." }, { status: 500 });
    }

    const claudeApiKey = userSettings?.claude_api_key?.trim();
    const baseResumeUrl = userSettings?.base_resume_url?.trim();

    if (!claudeApiKey) {
      return NextResponse.json(
        { error: "Missing Gemini API key. Please add it in Settings before generating." },
        { status: 400 },
      );
    }

    if (!baseResumeUrl) {
      return NextResponse.json(
        { error: "Missing base resume. Please upload a base resume in Settings before generating." },
        { status: 400 },
      );
    }

    const inferredTitle = inferJdTitleFromJobUrl(jobUrl);
    const inferredTags = extractTagsFromJobUrl(jobUrl);
    const inferredJdExcerpt =
      inferredTags.length > 0
        ? `Target role: ${inferredTitle}. Detected keywords: ${inferredTags.slice(0, 6).join(", ")}.`
        : `Target role: ${inferredTitle}.`;

    let { data: generationRow, error: generationError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        job_url: jobUrl,
        jd_url: jobUrl,
        jd_title: inferredTitle,
        jd_excerpt: inferredJdExcerpt,
        matched_tags: inferredTags,
        matched_skills: inferredTags,
        new_skills_added: [],
        resume_changes: [],
        resume_before_summary: "Base resume submitted by the user before role-specific tailoring.",
        resume_after_summary: null,
        status: "processing",
        company_name: getCompanyNameFromJobUrl(jobUrl),
      })
      .select("id")
      .single();

    if (isMissingColumnError(generationError?.code)) {
      const fallback = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          job_url: jobUrl,
          status: "processing",
        })
        .select("id")
        .single();
      generationRow = fallback.data;
      generationError = fallback.error;
    }

    if (generationError || !generationRow?.id) {
      return NextResponse.json(
        {
          error: "Failed to create generation job.",
          details: generationError
            ? {
                code: generationError.code ?? null,
                message: generationError.message ?? null,
                hint: generationError.hint ?? null,
              }
            : null,
        },
        { status: 500 },
      );
    }

    const generationId = generationRow.id;
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({ error: "Server misconfiguration: N8N_WEBHOOK_URL is missing." }, { status: 500 });
    }

    void fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_url: jobUrl,
        claude_api_key: claudeApiKey,
        base_resume_url: baseResumeUrl,
        generation_id: generationId,
      }),
    }).catch(() => {
      // Fire-and-forget by design. n8n handles retries/ops visibility.
    });

    return NextResponse.json({ generation_id: generationId });
  } catch {
    return NextResponse.json({ error: "Unexpected error while creating generation." }, { status: 500 });
  }
}
