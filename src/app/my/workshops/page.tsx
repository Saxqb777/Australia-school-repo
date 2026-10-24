import type { Metadata } from "next";
import { AppShell, PageHeading } from "@/components/AppShell";
import { WorkshopList } from "@/components/WorkshopList";
import { getMode } from "@/lib/mode";
import { requireUser } from "@/lib/session";
import { listPairingsFor, listWorkshops } from "@/lib/workshops";

export const metadata: Metadata = { title: "My workshops" };

export default async function MyWorkshopsPage() {
  const user = await requireUser(["TEACHER"]);
  const demo = (await getMode()) === "demo";
  const items = user.teacherId ? await listWorkshops(demo, [], user.teacherId) : [];
  const pairs = user.teacherId ? await listPairingsFor(demo, user.teacherId) : [];
  return (
    <AppShell user={user} active="my-workshops">
      <PageHeading eyebrow={user.name} title="My workshops and colleagues" />
      {pairs.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-cond text-xl font-semibold text-navy">Colleague pairing</h2>
          <ul className="mt-2 border-t border-rule">
            {pairs.map((p) => (
              <li key={p.id} className="border-b border-rule py-3">
                {p.role === "supported" ? (
                  <>
                    You are paired with <strong>{p.otherName}</strong> for {p.areaName}. Arrange to visit a lesson and talk it through.
                  </>
                ) : (
                  <>
                    You are supporting <strong>{p.otherName}</strong> in {p.areaName}. Thank you.
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-8 max-w-xl border-l-2 border-navy pl-4 text-ink-soft">
          No workshops for you yet. When you are invited to a workshop, or asked to lead one, it appears here with the date,
          place and topic.
        </p>
      ) : (
        <WorkshopList items={items} admin={false} />
      )}
    </AppShell>
  );
}
