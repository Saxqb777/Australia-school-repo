import { NextResponse } from "next/server";
import { SummaryUnavailableError } from "@/lib/ai/summary";
import { READABLE_TYPES } from "@/lib/ai/read-documents";
import { getMode } from "@/lib/mode";
import { createPeerFromFile, MAX_PEER_FILE_BYTES } from "@/lib/peer";
import { canManage, getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Upload a peer observer's completed form; the AI reads it into a record for checking. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword || !canManage(user)) {
    return NextResponse.json({ ok: false, message: "Only the coordinators and the administrator can add peer observations." }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: "Choose the PDF or photo of the form." }, { status: 400 });
  if (file.size > MAX_PEER_FILE_BYTES) {
    return NextResponse.json({ ok: false, message: "That file is over 4 MB. Scan at a lower resolution or take a smaller photo." }, { status: 413 });
  }
  const type = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  if (!READABLE_TYPES[type]) {
    return NextResponse.json({ ok: false, message: "Use a PDF, or a JPG or PNG photo of the form." }, { status: 415 });
  }
  try {
    const id = await createPeerFromFile(
      { name: file.name, type, data: Buffer.from(await file.arrayBuffer()) },
      user.id,
      (await getMode()) === "demo",
    );
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof SummaryUnavailableError) return NextResponse.json({ ok: false, message: error.message }, { status: 422 });
    console.error("peer upload failed", error);
    return NextResponse.json({ ok: false, message: "The form could not be read right now. Try again in a minute." }, { status: 502 });
  }
}
