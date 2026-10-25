import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AppShell, PageHeading } from "@/components/AppShell";
import { db } from "@/db";
import { peerFiles, teachers } from "@/db/schema";
import { getMode } from "@/lib/mode";
import { getPeer } from "@/lib/peer";
import { getRubric } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { PeerReview } from "./PeerReview";

export const metadata: Metadata = { title: "Peer observation" };

export default async function PeerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["ADMIN", "OBSERVER"]);
  if (!z.uuid().safeParse(id).success) notFound();
  const peer = await getPeer(id, (await getMode()) === "demo");
  if (!peer) notFound();
  const [rubric, people, file] = await Promise.all([
    getRubric(),
    db.select({ id: teachers.id, name: teachers.name }).from(teachers).orderBy(asc(teachers.name)),
    peer.fileId ? db.query.peerFiles.findFirst({ where: eq(peerFiles.id, peer.fileId), columns: { mimeType: true } }) : Promise.resolve(undefined),
  ]);
  return (
    <AppShell user={user} active="peer" wide>
      <Link href="/peer" className="label-caps hover:text-navy">
        Peer observations
      </Link>
      <PageHeading
        eyebrow={peer.observerName ? `Observed by ${peer.observerName}` : "Peer observation"}
        title={peer.teacherName || "Teacher not read"}
      />
      <PeerReview
        id={peer.id}
        status={peer.status}
        uncertain={peer.uncertain}
        fileUrl={peer.fileId ? `/api/peer/${peer.id}/file` : null}
        fileIsPdf={file?.mimeType === "application/pdf"}
        people={people}
        criteria={rubric.flatMap((a) => a.criteria.map((c) => ({ ...c, areaName: a.name })))}
        initial={{
          observerTeacherId: peer.observerTeacherId,
          observerName: peer.observerName,
          teacherId: peer.teacherId,
          teacherName: peer.teacherName,
          className: peer.className ?? "",
          subject: peer.subject ?? "",
          date: peer.date ?? "",
          period: peer.period?.toString() ?? "",
          topic: peer.topic ?? "",
          ratings: peer.ratings,
          comments: peer.comments,
          strengths: peer.strengths ?? "",
          improvements: peer.improvements ?? "",
          overallLevel: peer.overallLevel,
        }}
      />
    </AppShell>
  );
}
