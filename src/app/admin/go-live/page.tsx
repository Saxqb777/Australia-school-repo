import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resetDemoAction } from "@/app/actions/golive-actions";
import { AppShell, PageHeading } from "@/components/AppShell";
import { getMode } from "@/lib/mode";
import { requireUser } from "@/lib/session";
import { GoLiveForm } from "./GoLiveForm";

export const metadata: Metadata = { title: "Go live" };

export default async function GoLivePage() {
  const user = await requireUser(["ADMIN"]);
  if ((await getMode()) === "live") redirect("/admin");
  return (
    <AppShell user={user} active="register">
      <PageHeading eyebrow="Demo" title="Go live" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section className="border border-rule border-t-4 border-t-navy bg-sheet p-5">
          <h2 className="font-cond text-xl font-semibold">What happens when you press Go live</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed">
            <li>Every piece of demo data is deleted: the sample weeks, ratings, feedback, signatures, reflections, workshops, pairings, notifications and summaries.</li>
            <li>The real Term 1, Week 10 schedule (2 to 6 November 2026) becomes the register, with Ms. Ayan&rsquo;s and Ms. Marwa&rsquo;s visits ready to observe.</li>
            <li>The one-click demo sign-in disappears. Everyone signs in with their username and temporary password, and chooses their own password the first time.</li>
            <li>The guided tours start again for everyone.</li>
          </ol>
          <p className="mt-4 font-medium">This cannot be undone.</p>
          <div className="mt-5">
            <GoLiveForm />
          </div>
        </section>
        <aside className="space-y-3 text-sm">
          <h2 className="label-caps">Presenting again?</h2>
          <p className="text-ink-soft">Reset the demo to put every sample observation, workshop and notice back as it started.</p>
          <form action={resetDemoAction}>
            <button type="submit" className="btn btn-quiet w-full">
              Reset the demo
            </button>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
