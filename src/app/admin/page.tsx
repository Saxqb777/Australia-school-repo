import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { generateDigestAction } from "@/app/actions/admin-actions";
import { AppShell, PageHeading } from "@/components/AppShell";
import { DigestCard } from "@/components/DigestCard";
import { ExportMenu } from "@/components/ExportMenu";
import { GuidedTour, ReplayTourButton } from "@/components/GuidedTour";
import { StatusMark } from "@/components/StatusMark";
import { db } from "@/db";
import { digests } from "@/db/schema";
import { dateRange, dayMonth, weekdayName } from "@/lib/dates";
import { getMode } from "@/lib/mode";
import { listCycles, listUsers, listVisits } from "@/lib/queries";
import { ROLE_LABEL, requireUser } from "@/lib/session";
import { ADMIN_TOUR } from "@/lib/tours";
import { ResetPassword } from "./ResetPassword";

export const metadata: Metadata = { title: "Register" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ cycle?: string }> }) {
  const user = await requireUser(["ADMIN"]);
  const demo = (await getMode()) === "demo";
  const cycles = await listCycles(demo);
  const { cycle } = await searchParams;
  const selected = cycles.find((c) => c.id === cycle) ?? cycles[0];
  const [visits, people, digest] = await Promise.all([
    selected ? listVisits({ demo, cycleId: selected.id }) : Promise.resolve([]),
    listUsers(),
    db.query.digests.findFirst({ where: and(eq(digests.isDemo, demo)), orderBy: desc(digests.generatedAt) }),
  ]);
  const complete = visits.filter((v) => v.status === "complete").length;
  const inProgress = visits.filter((v) => v.status === "in_progress").length;
  const shared = visits.filter((v) => v.shared).length;
  const waiting = people.filter((p) => p.mustChangePassword).length;

  return (
    <AppShell user={user} active="register" wide>
      <PageHeading eyebrow={selected ? `${selected.label} · ${dateRange(selected.startDate, selected.endDate)}` : "Administration"} title="School register">
        <span data-tour="replay">
          <ReplayTourButton />
        </span>
        <ExportMenu scopeLabel="Everything: visits, ratings, judgements, feedback, teachers, logins (no passwords), rubric" />
      </PageHeading>

      {cycles.length > 1 ? (
        <nav aria-label="Cycles" className="mt-4 flex flex-wrap gap-2 text-sm">
          {cycles.map((c) => (
            <Link
              key={c.id}
              href={`/admin?cycle=${c.id}`}
              aria-current={c.id === selected?.id ? "page" : undefined}
              className={`border px-3 py-1.5 ${c.id === selected?.id ? "border-navy bg-navy text-white" : "border-rule bg-sheet hover:border-navy"}`}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 border-l border-t border-rule bg-sheet sm:grid-cols-5">
        {[
          ["Visits", visits.length],
          ["Complete", complete],
          ["In progress", inProgress],
          ["Shared with teachers", shared],
          ["Temporary passwords", waiting],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-r border-rule px-4 py-3">
            <dt className="label-caps">{label}</dt>
            <dd className="mt-1 font-mono text-2xl">{value}</dd>
          </div>
        ))}
      </dl>

      <section id="digest" className="mt-8 scroll-mt-20" aria-label="Friday summary">
        {digest ? (
          <DigestCard payload={digest.payload} generatedAt={digest.generatedAt} />
        ) : (
          <p className="border-l-2 border-navy pl-3 text-ink-soft">
            The Friday summary is made automatically every Friday afternoon: visits done and outstanding, and the week&rsquo;s
            top strengths and concerns. It appears here and in your notifications.
          </p>
        )}
        <form action={generateDigestAction} className="mt-2">
          <button type="submit" className="text-sm font-medium text-navy underline underline-offset-2">
            Make this week&rsquo;s summary now
          </button>
        </form>
      </section>

      <section className="mt-10" aria-labelledby="visits-h" data-tour="admin-visits">
        <h2 id="visits-h" className="font-cond text-xl font-semibold text-navy">
          All visits
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Every visit on the schedule. Visits by observers without an observer login are kept so the register is complete;
          only observers with a login can record observations.
        </p>
        {visits.length === 0 ? (
          <p className="mt-4 border-l-2 border-navy pl-3 text-ink-soft">
            No visits yet. Add a cycle and its visitation schedule in <Link href="/admin/setup" className="link">Setup</Link>.
          </p>
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
                      {v.observerUserId ? null : <span className="block text-xs text-ink-faint">No observer login</span>}
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
                      {v.shared ? <span className="block text-xs text-ink-soft">Shared</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="users-h" data-tour="admin-users">
        <h2 id="users-h" className="font-cond text-xl font-semibold text-navy">
          Logins
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Everyone signs in with their username. A reset gives a new temporary password, shown here once, and they choose their
          own at next sign in. Add people or change roles in <Link href="/admin/setup#people" className="link">Setup</Link>.
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
                    {demo ? (
                      <span className="text-xs text-ink-faint">After Go live</span>
                    ) : p.id === user.id ? (
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
      <GuidedTour tourKey="admin" steps={ADMIN_TOUR} autoStart={!user.toursCompleted.includes("admin")} />
    </AppShell>
  );
}
