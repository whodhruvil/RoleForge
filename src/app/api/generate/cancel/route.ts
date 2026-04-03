import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";

type CancelBody = {
  generation_id?: string;
};

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

    const body = (await request.json().catch(() => null)) as CancelBody | null;
    const generationId = body?.generation_id?.trim();

    if (!generationId) {
      return NextResponse.json({ error: "generation_id is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("generations")
      .update({ status: "cancelled" })
      .eq("id", generationId)
      .eq("user_id", user.id)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to cancel generation." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cancelled: Boolean(data?.id) }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unexpected error while cancelling generation." }, { status: 500 });
  }
}
