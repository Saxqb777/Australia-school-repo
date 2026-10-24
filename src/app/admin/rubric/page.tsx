import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { AppShell, PageHeading } from "@/components/AppShell";
import { db } from "@/db";
import { rubricCriteria, rubricEdits, users } from "@/db/schema";
import { getRubric } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { levelLabel, isLevel } from "@/lib/judgement";
import { CriterionEditor } from "./RubricEditor";

export const metadata: Metadata = { title: "Rubric wording" };

export default async function RubricPage() {
  const user = await requireUser(["ADMIN"]);
  const rubric = await getRubric();
  const history = await db
    .select({
      id: rubricEdits.id,
      code: rubricCriteria.code,
      level: rubricEdits.level,
      oldText: rubricEdits.oldText,
      newText: rubricEdits.newText,
      editedAt: rubricEdits.editedAt,
      by: users.name,
    })
    .from(rubricEdits)
    .innerJoin(rubricCriteria, eq(rubricCriteria.id, rubricEdits.criterionId))
    .leftJoin(users, eq(users.id, rubricEdits.editedByUserId))
    .orderBy(desc(rubricEdits.editedAt))
    .limit(50);
  return (
    <AppShell user={user} active="setup" wide>
      <PageHeading eyebrow="Setup" title="Rubric wording" />
      <p className="mt-4 max-w-3xl border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
        This wording appears on every observation form and PDF and must match the school&rsquo;s official Teacher Observation
        Form. Change it only when the school changes the form. Every change is recorded below with the old wording.
      </p>
      {history.length > 0 ? (
        <details className="mt-4 border border-rule bg-sheet">
          <summary className="cursor-pointer px-4 py-3 font-medium text-navy">Change history ({history.length})</summary>
          <ul className="border-t border-rule text-sm">
            {history.map((h) => (
              <li key={h.id} className="border-b border-rule px-4 py-2">
                <p>
                  <span className="font-mono">{h.code}</span> {isLevel(h.level) ? levelLabel(h.level) : "criterion wording"} · {h.by ?? "Unknown"} ·{" "}
                  {h.editedAt.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}
                </p>
                <p className="text-ink-soft line-through">{h.oldText}</p>
                <p>{h.newText}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {rubric.map((a) => (
        <section key={a.id} className="mt-8">
          <h2 className="bg-navy px-3 py-2 font-cond text-sm font-semibold uppercase tracking-wider text-white">
            {a.position}. {a.name}
          </h2>
          <div className="space-y-6 border-x border-b border-rule bg-sheet p-4">
            {a.criteria.map((c) => (
              <CriterionEditor key={c.id} id={c.id} code={c.code} name={c.name} descriptors={c.descriptors} />
            ))}
          </div>
        </section>
      ))}
    </AppShell>
  );
}
