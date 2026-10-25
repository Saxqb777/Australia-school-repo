import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/mode";
import { getRubric, listVisits } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import type { WelcomeData } from "@/components/welcome/types";

/** The real data the welcome story shows: the observer's own week and the form's first criterion. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (user.role !== "OBSERVER") return NextResponse.json<WelcomeData>({ week: null, criterion: null, firstVisitHref: null, example: null });

  const [visits, rubric] = await Promise.all([listVisits({ demo: await isDemoMode(), observerUserId: user.id }), getRubric()]);
  const firstOpen = visits.find((v) => v.status !== "complete") ?? null;
  const cycleId = (firstOpen ?? visits[0])?.cycleId;
  const inCycle = visits.filter((v) => v.cycleId === cycleId);
  // Three rows from the week, starting at the next visit still to do, so the list looks like today.
  const start = Math.max(0, Math.min(inCycle.findIndex((v) => v.id === firstOpen?.id), inCycle.length - 3));
  const criterion = rubric[0]?.criteria[0] ?? null;
  return NextResponse.json<WelcomeData>({
    week:
      inCycle.length > 0
        ? {
            label: inCycle[0]?.cycleLabel.replace(/^Demo · /, "") ?? "",
            count: inCycle.length,
            rows: inCycle.slice(start, start + 3).map((v) => ({
              day: new Date(`${v.date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
              period: v.period,
              teacherName: v.teacherName,
              className: v.className,
              subject: v.subject,
              status: v.status,
              ratedCount: v.ratedCount,
            })),
          }
        : null,
    criterion: criterion ? { code: criterion.code, name: criterion.name, descriptors: criterion.descriptors } : null,
    firstVisitHref: firstOpen ? `/observe/${firstOpen.id}` : null,
    example: firstOpen ? { teacherName: firstOpen.teacherName, className: firstOpen.className, subject: firstOpen.subject } : null,
  });
}
