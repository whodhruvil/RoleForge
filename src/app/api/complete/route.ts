import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCompanyNameFromJobUrl } from "@/lib/company";

type CompleteBody = {
  generation_id?: string;
  generationId?: string;
  id?: string;
  download_url?: string | null;
  status?: string;
  company_name?: string | null;
  companyName?: string | null;
};
type GenerationStatus = "processing" | "completed" | "error" | "cancelled";

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const ALLOWED_STATUSES: readonly GenerationStatus[] = ["processing", "completed", "error", "cancelled"];

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
      .select("job_url, company_name")
      .eq("id", generationId)
      .maybeSingle();

    const inferredCompanyName =
      existingRow?.company_name?.trim() ||
      getCompanyNameFromJobUrl(existingRow?.job_url ?? null);

    const updatePayload: {
      status: string;
      download_url: string | null;
      company_name?: string | null;
    } = {
      status,
      download_url: downloadUrl,
    };

    if (companyNameRaw !== undefined) {
      updatePayload.company_name = companyName && companyName.length > 0 ? companyName : null;
    } else if (!existingRow?.company_name) {
      updatePayload.company_name = inferredCompanyName;
    }

    let updateQuery = supabase
      .from("generations")
      .update(updatePayload)
      .eq("id", generationId);

    if (status !== "cancelled") {
      updateQuery = updateQuery.neq("status", "cancelled");
    }

    let { data, error } = await updateQuery.select("id").maybeSingle();

    if (error?.code === "42703" && updatePayload.company_name !== undefined) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.company_name;

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
