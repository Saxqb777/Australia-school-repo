import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, PageHeading } from "@/components/AppShell";
import { WorkshopList } from "@/components/WorkshopList";
import { getMode } from "@/lib/mode";
import { getRubric, loadFacts } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { listWorkshops } from "@/lib/workshops";

export const metadata: Metadata = { title: "Workshops" };

export default async function WorkshopsPage() {
  const user = await requireUser(["ADMIN", "OBSERVER"]);
  const demo = (await getMode()) === "demo";
  const facts = await loadFacts(await getRubric(), { demo });
  const items = await listWorkshops(demo, facts);
  return (
    <AppShell user={user} active="workshops">
      <PageHeading eyebrow="Professional learning" title="Workshops" />
      <p className="mt-4 max-w-3xl text-ink-soft">
        Workshops are scheduled from the suggestions on the <Link href="/dashboard#plan-h" className="link">dashboard</Link>. Once
        attendance is recorded, each attendee&rsquo;s level in that area before and after the workshop is shown, so you can see
        whether it moved the needle.
      </p>
      {items.length === 0 ? (
        <p className="mt-8 max-w-xl border-l-2 border-navy pl-4 text-ink-soft">
          No workshops yet. When observations are complete, the dashboard suggests workshops for the weakest areas; the
          administrator schedules one with a click and the attendees are told in the app.
        </p>
      ) : (
        <WorkshopList items={items} admin={user.role === "ADMIN"} />
      )}
    </AppShell>
  );
}
