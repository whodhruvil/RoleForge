import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCompanyNameFromJobUrl } from "@/lib/company";
import { extractTagsFromJobUrl, inferJdTitleFromJobUrl } from "@/lib/job-intelligence";

type CompleteBody = {
  generation_id?: string;
  generationId?: string;
  id?: string;
  download_url?: string | null;
  status?: string;
  company_name?: string | null;
  companyName?: string | null;
  jd_url?: string | null;
  jdUrl?: string | null;
  jd_title?: string | null;
  jdTitle?: string | null;
  jd_excerpt?: string | null;
  jdExcerpt?: string | null;
  ats_score?: number | string | null;
  atsScore?: number | string | null;
  matched_tags?: string[] | string | null;
  matchedTags?: string[] | string | null;
  matched_skills?: string[] | string | null;
  matchedSkills?: string[] | string | null;
  new_skills_added?: string[] | string | null;
  newSkillsAdded?: string[] | string | null;
  resume_changes?: string[] | string | null;
  resumeChanges?: string[] | string | null;
  resume_before_summary?: string | null;
  resumeBeforeSummary?: string | null;
  resume_after_summary?: string | null;
  resumeAfterSummary?: string | null;
};

type ExistingGenerationRow = {
  job_url: string | null;
  company_name: string | null;
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
};

type GenerationStatus = "processing" | "completed" | "error" | "cancelled";

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const ALLOWED_STATUSES: readonly GenerationStatus[] = ["processing", "completed", "error", "cancelled"];

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

function extractUuid(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  const match = trimmed.match(UUID_REGEX);
  return match?.[0] ?? null;
}

function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "CALLBACK_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function parseList(value: unknown, max: number): string[] | null {
  if (Array.isArray(value)) {
    const normalized = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length > 0 ? normalized.slice(0, max) : [];
  }

  if (typeof value === "string") {
    const parsed = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return parsed.length > 0 ? parsed.slice(0, max) : [];
  }

  return null;
}

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }

  return null;
}

function fallbackAtsScore(tagCount: number) {
  if (tagCount >= 6) return 92;
  if (tagCount >= 4) return 88;
  if (tagCount >= 2) return 82;
  return 76;
}

function pickFirstNonEmptyString(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const callbackSecret = getEnv("CALLBACK_SECRET");
    const authorization = request.headers.get("authorization") ?? "";
    const expectedAuthHeader = `Bearer ${callbackSecret}`;

    if (authorization !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as CompleteBody | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const rawGenerationId = body.generation_id ?? body.generationId ?? body.id;
    const generationId = extractUuid(rawGenerationId);
    const status = body.status?.trim().toLowerCase();
    const downloadUrl = typeof body.download_url === "string" ? body.download_url.trim() : null;
    const companyNameRaw = body.company_name ?? body.companyName;
    const companyName = typeof companyNameRaw === "string" ? companyNameRaw.trim() : null;
    const jdUrlRaw = body.jd_url ?? body.jdUrl;
    const jdTitleRaw = body.jd_title ?? body.jdTitle;
    const jdExcerptRaw = body.jd_excerpt ?? body.jdExcerpt;
    const atsScoreRaw = body.ats_score ?? body.atsScore;
    const matchedTagsRaw = body.matched_tags ?? body.matchedTags;
    const matchedSkillsRaw = body.matched_skills ?? body.matchedSkills;
    const newSkillsAddedRaw = body.new_skills_added ?? body.newSkillsAdded;
    const resumeChangesRaw = body.resume_changes ?? body.resumeChanges;
    const resumeBeforeSummaryRaw = body.resume_before_summary ?? body.resumeBeforeSummary;
    const resumeAfterSummaryRaw = body.resume_after_summary ?? body.resumeAfterSummary;

    const jdUrl = typeof jdUrlRaw === "string" ? jdUrlRaw.trim() : null;
    const jdTitle = typeof jdTitleRaw === "string" ? jdTitleRaw.trim() : null;
    const jdExcerpt = typeof jdExcerptRaw === "string" ? jdExcerptRaw.trim() : null;
    const atsScore = parseScore(atsScoreRaw);
    const matchedTags = parseList(matchedTagsRaw, 12);
    const matchedSkills = parseList(matchedSkillsRaw, 20);
    const newSkillsAdded = parseList(newSkillsAddedRaw, 20);
    const resumeChanges = parseList(resumeChangesRaw, 25);
    const resumeBeforeSummary =
      typeof resumeBeforeSummaryRaw === "string" ? resumeBeforeSummaryRaw.trim() : null;
    const resumeAfterSummary =
      typeof resumeAfterSummaryRaw === "string" ? resumeAfterSummaryRaw.trim() : null;

    if (rawGenerationId === undefined || rawGenerationId === null || `${rawGenerationId}`.trim() === "") {
      return NextResponse.json({ error: "generation_id is required." }, { status: 400 });
    }

    if (!generationId) {
      return NextResponse.json({ error: "generation_id must be a valid UUID." }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }

    if (!ALLOWED_STATUSES.includes(status as GenerationStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}.` },
        { status: 400 },
      );
    }

    if (status === "completed" && !downloadUrl) {
      return NextResponse.json(
        { error: "download_url is required when status is completed." },
        { status: 400 },
      );
    }

    if (companyNameRaw !== undefined && companyNameRaw !== null && typeof companyNameRaw !== "string") {
      return NextResponse.json({ error: "company_name must be a string." }, { status: 400 });
    }

    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: existingRow } = await supabase
      .from("generations")
      .select(
        "job_url, company_name, jd_url, jd_title, jd_excerpt, ats_score, matched_tags, matched_skills, new_skills_added, resume_changes, resume_before_summary, resume_after_summary",
      )
      .eq("id", generationId)
      .maybeSingle<ExistingGenerationRow>();

    const inferredJobUrl =
      pickFirstNonEmptyString(jdUrl, existingRow?.jd_url ?? null, existingRow?.job_url ?? null) ?? null;
    const inferredCompanyName =
      pickFirstNonEmptyString(companyName, existingRow?.company_name ?? null) ??
      getCompanyNameFromJobUrl(inferredJobUrl);
    const inferredJdTitle = pickFirstNonEmptyString(jdTitle, existingRow?.jd_title ?? null) ?? inferJdTitleFromJobUrl(inferredJobUrl ?? "");
    const inferredTags =
      (matchedTags && matchedTags.length > 0 ? matchedTags : null) ??
      (existingRow?.matched_tags && existingRow.matched_tags.length > 0 ? existingRow.matched_tags : null) ??
      extractTagsFromJobUrl(inferredJobUrl ?? "");
    const inferredSkills =
      (matchedSkills && matchedSkills.length > 0 ? matchedSkills : null) ??
      (existingRow?.matched_skills && existingRow.matched_skills.length > 0 ? existingRow.matched_skills : null) ??
      inferredTags;

    const generatedJdExcerpt =
      pickFirstNonEmptyString(jdExcerpt, existingRow?.jd_excerpt ?? null) ??
      [
        inferredJdTitle && inferredJdTitle !== "Job Description" ? `Target role: ${inferredJdTitle}.` : null,
        inferredTags.length > 0
          ? `Detected keywords: ${inferredTags.slice(0, 6).join(", ")}.`
          : "Role-specific keyword extraction completed from job URL.",
      ]
        .filter(Boolean)
        .join(" ");

    const generatedResumeBeforeSummary =
      pickFirstNonEmptyString(resumeBeforeSummary, existingRow?.resume_before_summary ?? null) ??
      "Base resume submitted by the user before role-specific tailoring.";
    const generatedResumeAfterSummary =
      pickFirstNonEmptyString(resumeAfterSummary, existingRow?.resume_after_summary ?? null) ??
      `Resume optimized for ${inferredJdTitle || "the target role"} with stronger keyword alignment and quantified impact.`;

    const generatedResumeChanges =
      (resumeChanges && resumeChanges.length > 0 ? resumeChanges : null) ??
      (existingRow?.resume_changes && existingRow.resume_changes.length > 0 ? existingRow.resume_changes : null) ??
      [
        "Aligned skills and tools with job description keywords.",
        "Rewrote experience bullets for impact and outcomes.",
        "Improved ATS readability with role-specific phrasing.",
      ];

    const generatedNewSkills =
      (newSkillsAdded && newSkillsAdded.length > 0 ? newSkillsAdded : null) ??
      (existingRow?.new_skills_added && existingRow.new_skills_added.length > 0
        ? existingRow.new_skills_added
        : inferredSkills.filter((skill) => !inferredTags.includes(skill)).slice(0, 8));

    const generatedAtsScore =
      atsScore ??
      existingRow?.ats_score ??
      fallbackAtsScore(inferredSkills.length > 0 ? inferredSkills.length : inferredTags.length);

    const updatePayload: {
      status: string;
      download_url: string | null;
      company_name?: string | null;
      jd_url?: string | null;
      jd_title?: string | null;
      jd_excerpt?: string | null;
      ats_score?: number | null;
      matched_tags?: string[] | null;
      matched_skills?: string[] | null;
      new_skills_added?: string[] | null;
      resume_changes?: string[] | null;
      resume_before_summary?: string | null;
      resume_after_summary?: string | null;
    } = {
      status,
      download_url: downloadUrl,
    };

    if (companyNameRaw !== undefined) {
      updatePayload.company_name = companyName && companyName.length > 0 ? companyName : null;
    } else if (!existingRow?.company_name) {
      updatePayload.company_name = inferredCompanyName;
    }

    if (jdUrlRaw !== undefined) {
      updatePayload.jd_url = jdUrl;
    } else if (!existingRow?.jd_url && inferredJobUrl) {
      updatePayload.jd_url = inferredJobUrl;
    }

    if (jdTitleRaw !== undefined) {
      updatePayload.jd_title = jdTitle;
    } else if (!existingRow?.jd_title) {
      updatePayload.jd_title = inferredJdTitle;
    }

    if (jdExcerptRaw !== undefined) {
      updatePayload.jd_excerpt = jdExcerpt;
    } else if (status === "completed" && !existingRow?.jd_excerpt) {
      updatePayload.jd_excerpt = generatedJdExcerpt || null;
    }

    if (atsScoreRaw !== undefined) {
      updatePayload.ats_score = atsScore;
    } else if (status === "completed" && existingRow?.ats_score === null) {
      updatePayload.ats_score = generatedAtsScore;
    }

    if (matchedTagsRaw !== undefined) {
      updatePayload.matched_tags = matchedTags;
    } else if (!existingRow?.matched_tags || existingRow.matched_tags.length === 0) {
      updatePayload.matched_tags = inferredTags;
    }

    if (matchedSkillsRaw !== undefined) {
      updatePayload.matched_skills = matchedSkills;
    } else if (!existingRow?.matched_skills || existingRow.matched_skills.length === 0) {
      updatePayload.matched_skills = inferredSkills;
    }

    if (newSkillsAddedRaw !== undefined) {
      updatePayload.new_skills_added = newSkillsAdded;
    } else if (status === "completed" && (!existingRow?.new_skills_added || existingRow.new_skills_added.length === 0)) {
      updatePayload.new_skills_added = generatedNewSkills;
    }

    if (resumeChangesRaw !== undefined) {
      updatePayload.resume_changes = resumeChanges;
    } else if (status === "completed" && (!existingRow?.resume_changes || existingRow.resume_changes.length === 0)) {
      updatePayload.resume_changes = generatedResumeChanges;
    }

    if (resumeBeforeSummaryRaw !== undefined) {
      updatePayload.resume_before_summary = resumeBeforeSummary;
    } else if (status === "completed" && !existingRow?.resume_before_summary) {
      updatePayload.resume_before_summary = generatedResumeBeforeSummary;
    }

    if (resumeAfterSummaryRaw !== undefined) {
      updatePayload.resume_after_summary = resumeAfterSummary;
    } else if (status === "completed" && !existingRow?.resume_after_summary) {
      updatePayload.resume_after_summary = generatedResumeAfterSummary;
    }

    let updateQuery = supabase.from("generations").update(updatePayload).eq("id", generationId);

    if (status !== "cancelled") {
      updateQuery = updateQuery.neq("status", "cancelled");
    }

    let { data, error } = await updateQuery.select("id").maybeSingle();

    if (isMissingColumnError(error?.code)) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.company_name;
      delete fallbackPayload.jd_url;
      delete fallbackPayload.jd_title;
      delete fallbackPayload.jd_excerpt;
      delete fallbackPayload.ats_score;
      delete fallbackPayload.matched_tags;
      delete fallbackPayload.matched_skills;
      delete fallbackPayload.new_skills_added;
      delete fallbackPayload.resume_changes;
      delete fallbackPayload.resume_before_summary;
      delete fallbackPayload.resume_after_summary;

      let fallbackQuery = supabase
        .from("generations")
        .update(fallbackPayload)
        .eq("id", generationId);

      if (status !== "cancelled") {
        fallbackQuery = fallbackQuery.neq("status", "cancelled");
      }

      const fallback = await fallbackQuery.select("id").maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      if (error.code === "22P02") {
        return NextResponse.json({ error: "generation_id must be a valid UUID." }, { status: 400 });
      }

      return NextResponse.json(
        {
          error: "Failed to update generation.",
          details: {
            code: error.code ?? null,
            message: error.message ?? null,
            hint: error.hint ?? null,
          },
        },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: true,
          updated: false,
          message: "No row updated (generation missing or already cancelled).",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true, updated: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected callback error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
