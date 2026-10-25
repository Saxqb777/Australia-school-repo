import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { peerFiles } from "@/db/schema";
import { getMode } from "@/lib/mode";
import { getPeer } from "@/lib/peer";
import { canManage, getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** The original file the team leader handed in. Coordinators and admin only. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !canManage(user)) return new Response("Not allowed.", { status: 403 });
  if (!z.uuid().safeParse(id).success) return new Response("Not found.", { status: 404 });
  const peer = await getPeer(id, (await getMode()) === "demo");
  if (!peer?.fileId) return new Response("No original file.", { status: 404 });
  const file = await db.query.peerFiles.findFirst({ where: eq(peerFiles.id, peer.fileId) });
  if (!file) return new Response("No original file.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName.replace(/[^\w.\- ]+/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
