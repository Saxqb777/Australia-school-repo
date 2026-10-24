import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, PageHeading } from "@/components/AppShell";
import { latestPerTeacher } from "@/lib/analytics";
import { levelLabel } from "@/lib/judgement";
import { getMode } from "@/lib/mode";
import { GRADE_BAND_LABELS } from "@/lib/names";
import { getRubric, listTeachers, loadFacts } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage() {
  const user = await requireUser(["ADMIN", "OBSERVER"]);
  const demo = (await getMode()) === "demo";
  const [people, facts] = await Promise.all([listTeachers(), loadFacts(await getRubric(), { demo })]);
  const latest = new Map(latestPerTeacher(facts).map((f) => [f.teacherId, f]));
  const counts = new Map<string, number>();
  for (const f of facts) counts.set(f.teacherId, (counts.get(f.teacherId) ?? 0) + 1);
  return (
    <AppShell user={user} active="teachers">
      <PageHeading eyebrow="Progress over time" title="Teachers" />
      <div className="mt-6 overflow-x-auto border border-rule bg-sheet">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="bg-navy text-left text-white">
              {["Teacher", "Grade band", "Subjects", "Completed observations", "Latest overall"].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-cond font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((t) => {
              const l = latest.get(t.id);
              return (
                <tr key={t.id} className="border-t border-rule hover:bg-navy-wash">
                  <td className="px-3 py-2">
                    <Link href={`/teachers/${t.id}`} className="link">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{t.gradeBand ? GRADE_BAND_LABELS[t.gradeBand] : ""}</td>
                  <td className="px-3 py-2">{t.subjects.join(", ")}</td>
                  <td className="px-3 py-2 font-mono">{counts.get(t.id) ?? 0}</td>
                  <td className="px-3 py-2">{l?.overall ? levelLabel(l.overall) : <span className="text-ink-faint">Not yet observed</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
