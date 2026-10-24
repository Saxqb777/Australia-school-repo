import { canSeeDashboard } from "@/lib/access";
import { loadDashboard, parseFilters } from "@/lib/dashboard";
import { toXlsx, type Sheet } from "@/lib/export";
import { levelLabel } from "@/lib/judgement";
import { getMode } from "@/lib/mode";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The dashboard's tables, with the same filters, as an Excel workbook. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword || !canSeeDashboard(user)) return new Response("Not allowed.", { status: 403 });
  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
  const d = await loadDashboard((await getMode()) === "demo", filters);
  const criteria = d.rubric.flatMap((a) => a.criteria.map((c) => ({ ...c, areaName: a.name })));
  const lvl = (n: number | null | undefined) => (n ? levelLabel(n as 1 | 2 | 3 | 4 | 5 | 6) : null);
  const sheets: Sheet[] = [
    {
      name: "Area averages",
      columns: [
        { header: "Area", width: 34 },
        { header: "Mean level (1 Outstanding – 6 Very Weak)", width: 14 },
        { header: "Rounded", width: 14 },
      ],
      rows: d.rubric.map((a) => {
        const m = d.areaMean.get(a.id) ?? null;
        return [a.name, m === null ? null : Number(m.toFixed(2)), m === null ? null : lvl(Math.min(6, Math.max(1, Math.floor(m + 0.5))))];
      }),
    },
    {
      name: "Criterion averages",
      columns: [
        { header: "Area", width: 30 },
        { header: "Code", width: 6 },
        { header: "Criterion", width: 50, wrap: true },
        { header: "Mean level", width: 12 },
      ],
      rows: criteria.map((c) => {
        const m = d.criterionMean.get(c.id) ?? null;
        return [c.areaName, c.code, c.name, m === null ? null : Number(m.toFixed(2))];
      }),
    },
    {
      name: "Teacher by criterion",
      columns: [
        { header: "Teacher", width: 22 },
        { header: "Cycle", width: 18 },
        { header: "Subject", width: 14 },
        ...criteria.map((c) => ({ header: c.code, width: 7 })),
        { header: "Overall", width: 13 },
      ],
      rows: d.latest.map((f) => [f.teacherName, f.cycleLabel, f.subject, ...criteria.map((c) => f.ratings.get(c.id) ?? null), lvl(f.overall)]),
    },
    {
      name: "Experts and support",
      columns: [
        { header: "Area", width: 30 },
        { header: "Experts (Very Good or Outstanding)", width: 50, wrap: true },
        { header: "Needing support (Acceptable or below)", width: 50, wrap: true },
      ],
      rows: d.rubric.map((a) => [
        a.name,
        (d.experts.get(a.id) ?? []).map((t) => t.teacherName).join(", "),
        (d.flagged.get(a.id) ?? []).map((t) => `${t.teacherName} (${levelLabel(t.level)})`).join(", "),
      ]),
    },
    {
      name: "Workshop suggestions",
      columns: [
        { header: "Area", width: 30 },
        { header: "Attend", width: 50, wrap: true },
        { header: "Lead", width: 30, wrap: true },
        { header: "Criteria to cover", width: 60, wrap: true },
      ],
      rows: d.plan.map((w) => [
        w.areaName,
        w.attendees.map((t) => t.teacherName).join(", "),
        w.leads.map((t) => t.teacherName).join(", "),
        w.criteria.map((c) => `${c.code} ${c.name}`).join("\n"),
      ]),
    },
    {
      name: "Peer pairs",
      columns: [
        { header: "Teacher", width: 22 },
        { header: "Area", width: 30 },
        { header: "Paired with", width: 22 },
        { header: "Introduced", width: 12 },
      ],
      rows: d.pairs.map((p) => [p.teacher.teacherName, p.areaName, p.partner.teacherName, p.introducedAt ? "Yes" : "No"]),
    },
  ];
  const body = await toXlsx(sheets, "ASAD observation dashboard");
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="asad-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
