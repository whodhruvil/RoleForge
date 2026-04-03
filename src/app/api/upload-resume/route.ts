import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { MAX_RESUME_FILE_BYTES } from "@/lib/validation";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

const BUCKET_NAME = "base_resumes";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function getSafeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Content-Type must be multipart/form-data." }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file in form data." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only .pdf files are allowed." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_RESUME_FILE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum allowed size is 5MB." }, { status: 400 });
    }

    const safeFileName = getSafeFileName(file.name || "resume.pdf");
    const objectPath = `${user.id}/${Date.now()}-${safeFileName}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(objectPath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError || !uploadData) {
      return NextResponse.json(
        { error: uploadError?.message || "Failed to upload file." },
        { status: 500 },
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(uploadData.path, ONE_YEAR_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: signedUrlError?.message || "Failed to create signed URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      downloadUrl: signedUrlData.signedUrl,
      signedUrl: signedUrlData.signedUrl,
      path: uploadData.path,
      fileName: file.name,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while uploading resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
