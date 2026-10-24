import type { Metadata } from "next";
import Link from "next/link";
import { ExportMenu } from "@/components/ExportMenu";
import { GuidedTour, ReplayTourButton } from "@/components/GuidedTour";
import { Masthead } from "@/components/Masthead";
import { StatusMark } from "@/components/StatusMark";
import { dateRange, dayMonth, weekdayName } from "@/lib/dates";
import { listUsers, listVisits } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { ADMIN_TOUR } from "@/lib/tours";
import { ResetPassword } from "./ResetPassword";

export const metadata: Metadata = { title: "Administration" };

const ROLE_LABEL = { ADMIN: "Admin", OBSERVER: "Observer", TEACHER: "Teacher" } as const;

export default async function AdminPage() {
  const user = await requireUser(["ADMIN"]);
  const [visits, people] = await Promise.all([listVisits({}), listUsers()]);
  const first = visits[0];
  const complete = visits.filter((v) => v.status === "complete").length;
  const inProgress = visits.filter((v) => v.status === "in_progress").length;
  const waiting = people.filter((p) => p.mustChangePassword).length;

  return (
    <>
      <Masthead userName={user.name} roleLabel="Administrator" />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b-2 border-navy pb-4">
          <div>
            <p className="label-caps">{first ? `${first.cycleLabel} · ${dateRange(first.cycleStart, first.cycleEnd)}` : "Administration"}</p>
            <h1 className="mt-1 font-cond text-3xl font-semibold text-navy sm:text-4xl">School register</h1>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span data-tour="replay">
              <ReplayTourButton />
            </span>
            <ExportMenu scopeLabel="Everything: visits, ratings, judgements, teachers, logins (no passwords), rubric" />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 border-l border-t border-rule bg-sheet sm:grid-cols-4">
          {[
            ["Visits this week", visits.length],
            ["Complete", complete],
            ["In progress", inProgress],
            ["Temporary passwords", waiting],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-r border-rule px-4 py-3">
              <dt className="label-caps">{label}</dt>
              <dd className="mt-1 font-mono text-2xl">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-10" aria-labelledby="visits-h" data-tour="admin-visits">
          <h2 id="visits-h" className="font-cond text-xl font-semibold text-navy">All visits</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Visits by observers without a login are recorded from the schedule so the register is complete. Only Ms. Ayan
            and Ms. Marwa can record observations for now.
          </p>
          {visits.length === 0 ? (
            <p className="mt-4 border-l-2 border-navy pl-3 text-ink-soft">No visits yet. Visits appear here once a visitation schedule is added.</p>
          ) : (
            <div className="mt-3 overflow-x-auto border border-rule bg-sheet">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="bg-navy text-left text-white">
                    {["Day", "P", "Observer", "Teacher", "Class", "Subject", "Status"].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 font-cond font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id} className="border-t border-rule hover:bg-navy-wash">
                      <td className="whitespace-nowrap px-3 py-2">
                        {weekdayName(v.date).slice(0, 3)} <span className="text-ink-soft">{dayMonth(v.date)}</span>
                      </td>
                      <td className="px-3 py-2 font-mono">{v.period}</td>
                      <td className="px-3 py-2">
                        {v.observerName}
                        {v.observerUserId ? null : <span className="block text-xs text-ink-faint">No login</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/observe/${v.id}`} className="link">
                          {v.teacherName}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{v.className}</td>
                      <td className="px-3 py-2">{v.subject}</td>
                      <td className="px-3 py-2">
                        <StatusMark status={v.status} ratedCount={v.ratedCount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10" aria-labelledby="users-h" data-tour="admin-users">
          <h2 id="users-h" className="font-cond text-xl font-semibold text-navy">Logins</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Everyone signs in with their username. A reset gives a new temporary password, shown here once, and they choose
            their own at next sign in.
          </p>
          <div className="mt-3 overflow-x-auto border border-rule bg-sheet">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="bg-navy text-left text-white">
                  {["Name", "Username", "Role", "Password", ""].map((h, i) => (
                    <th key={h || i} scope="col" className="px-3 py-2 font-cond font-semibold">
                      {h || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className="border-t border-rule align-top">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-[0.85rem]">{p.username}</td>
                    <td className="px-3 py-2">{ROLE_LABEL[p.role]}</td>
                    <td className="px-3 py-2 text-ink-soft">{p.mustChangePassword ? "Temporary" : "Chosen"}</td>
                    <td className="px-3 py-2 text-right">
                      {p.id === user.id ? (
                        <Link href="/change-password" className="text-sm font-medium text-navy underline underline-offset-2">
                          Change mine
                        </Link>
                      ) : (
                        <ResetPassword userId={p.id} name={p.name} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <GuidedTour tourKey="admin" steps={ADMIN_TOUR} autoStart={!user.toursCompleted.includes("admin")} />
    </>
  );
}
