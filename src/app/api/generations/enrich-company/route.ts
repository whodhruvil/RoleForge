import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getCompanyNameFromJobUrl } from "@/lib/company";

type GenerationRow = {
  id: string;
  job_url: string;
  company_name: string | null;
};

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("generations")
      .select("id, job_url, company_name")
      .eq("user_id", user.id)
      .or("company_name.is.null,company_name.eq.");

    if (error) {
      return NextResponse.json({ error: "Failed to load generations for enrichment." }, { status: 500 });
    }

    const rows = (data ?? []) as GenerationRow[];
    let updatedCount = 0;

    for (const row of rows) {
      const inferred = getCompanyNameFromJobUrl(row.job_url);
      if (!inferred || inferred === "Company Not Detected") {
        continue;
      }

      const { error: updateError } = await supabase
        .from("generations")
        .update({ company_name: inferred })
        .eq("id", row.id)
        .eq("user_id", user.id);

      if (!updateError) {
        updatedCount += 1;
      }
    }

    return NextResponse.json({ ok: true, scanned: rows.length, updated: updatedCount });
  } catch {
    return NextResponse.json({ error: "Unexpected error while enriching company names." }, { status: 500 });
  }
}
