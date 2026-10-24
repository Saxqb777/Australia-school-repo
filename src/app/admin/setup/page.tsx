import type { Metadata } from "next";
import Link from "next/link";
import { changeRoleAction } from "@/app/actions/setup-actions";
import { AppShell, PageHeading } from "@/components/AppShell";
import { dateRange } from "@/lib/dates";
import { getMode } from "@/lib/mode";
import { listCycles, listUsers } from "@/lib/queries";
import { ROLE_LABEL, requireUser } from "@/lib/session";
import { CycleForm, PersonForm, ScheduleForm } from "./SetupForms";

export const metadata: Metadata = { title: "Setup" };

export default async function SetupPage() {
  const user = await requireUser(["ADMIN"]);
  const demo = (await getMode()) === "demo";
  const [cycles, people] = await Promise.all([listCycles(demo), listUsers()]);
  return (
    <AppShell user={user} active="setup">
      <PageHeading eyebrow="Administration" title="Setup" />
      <nav aria-label="On this page" className="mt-4 flex flex-wrap gap-4 text-sm">
        <a href="#cycles" className="link">Cycles</a>
        <a href="#schedule" className="link">Visitation schedule</a>
        <a href="#people" className="link">People</a>
        <Link href="/admin/rubric" className="link">Rubric wording</Link>
      </nav>

      <section id="cycles" className="mt-8 scroll-mt-20">
        <h2 className="font-cond text-xl font-semibold text-navy">Observation cycles</h2>
        <p className="mt-1 text-sm text-ink-soft">A cycle is one observation week, such as Term 1, Week 10.</p>
        <ul className="mt-3 border-t border-rule text-sm">
          {cycles.map((c) => (
            <li key={c.id} className="flex flex-wrap gap-x-3 border-b border-rule py-2">
              <span className="font-medium">{c.label}</span>
              <span className="text-ink-soft">
                {c.academicYear} · {dateRange(c.startDate, c.endDate)}
              </span>
              <Link href={`/admin?cycle=${c.id}`} className="ml-auto link">
                Open register
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 border border-rule bg-sheet p-4">
          <h3 className="label-caps mb-2">New cycle</h3>
          <CycleForm />
        </div>
      </section>

      <section id="schedule" className="mt-12 scroll-mt-20">
        <h2 className="font-cond text-xl font-semibold text-navy">Visitation schedule</h2>
        <p className="mt-1 text-sm text-ink-soft">Paste the week&rsquo;s table or upload a CSV. You see every row before anything is saved.</p>
        <div className="mt-3 border border-rule bg-sheet p-4">
          {cycles.length === 0 ? <p className="text-ink-soft">Create a cycle first.</p> : <ScheduleForm cycles={cycles.map((c) => ({ id: c.id, label: c.label }))} />}
        </div>
      </section>

      <section id="people" className="mt-12 scroll-mt-20">
        <h2 className="font-cond text-xl font-semibold text-navy">People</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Add a teacher or an observer. Making a teacher an observer gives them the visits listed under their name on the
          schedule.
        </p>
        <div className="mt-3 border border-rule bg-sheet p-4">
          <PersonForm />
        </div>
        <div className="mt-4 overflow-x-auto border border-rule bg-sheet">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="bg-navy text-left text-white">
                {["Name", "Username", "Role", ""].map((h, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-cond font-semibold">
                    {h || <span className="sr-only">Change role</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people
                .filter((p) => p.role !== "ADMIN")
                .map((p) => (
                  <tr key={p.id} className="border-t border-rule">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-[0.85rem]">{p.username}</td>
                    <td className="px-3 py-2">{ROLE_LABEL[p.role]}</td>
                    <td className="px-3 py-2 text-right">
                      <form action={changeRoleAction}>
                        <input type="hidden" name="userId" value={p.id} />
                        <input type="hidden" name="role" value={p.role === "OBSERVER" ? "TEACHER" : "OBSERVER"} />
                        <button type="submit" className="text-sm font-medium text-navy underline underline-offset-2">
                          {p.role === "OBSERVER" ? "Make teacher" : "Make observer"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
