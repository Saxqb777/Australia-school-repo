import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { demoSignInAction } from "@/app/actions/auth-actions";
import { Masthead } from "@/components/Masthead";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getMode } from "@/lib/mode";
import { getCurrentUser, homePathFor } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const mode = await getMode();
  const user = await getCurrentUser();
  if (mode === "live" && user) redirect(user.mustChangePassword ? "/change-password" : homePathFor(user.role));

  if (mode === "demo") {
    const people = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).orderBy(asc(users.name));
    const admin = people.filter((p) => p.role === "ADMIN");
    const observers = people.filter((p) => p.role === "OBSERVER");
    const teacherRows = people.filter((p) => p.role === "TEACHER");
    const featured = await db.query.users.findFirst({ where: eq(users.username, "cornelia"), columns: { id: true, name: true } });
    const roleButton = (id: string, name: string, role: string, note: string) => (
      <form action={demoSignInAction} key={id}>
        <input type="hidden" name="userId" value={id} />
        <button type="submit" className="group flex w-full items-center gap-4 border-b border-rule px-4 py-3.5 text-left hover:bg-navy-wash">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{name}</span>
            <span className="block text-sm text-ink-soft">{note}</span>
          </span>
          <span className="label-caps !text-navy">{role}</span>
        </button>
      </form>
    );
    return (
      <>
        <Masthead />
        <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <p className="label-caps">Demo</p>
          <h1 className="mt-1 font-cond text-3xl font-semibold text-navy">See it from every side</h1>
          <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">
            This is a demonstration with sample ratings under real staff names. Nothing here is a real judgement. Choose who
            to view the system as; you can switch at any time from the banner at the top.
          </p>
          <div className="mt-6 border border-rule bg-sheet">
            {admin.map((a) => roleButton(a.id, a.name, "Administrator", "Whole school: register, dashboard, workshops, setup, Go live"))}
            {observers.map((o) => roleButton(o.id, o.name, "Observer", "Rates lessons on a phone, writes and shares feedback"))}
            {featured ? roleButton(featured.id, featured.name, "Teacher", "Reads feedback, signs it and replies") : null}
          </div>
          <details className="mt-4 border border-rule bg-sheet">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-navy">View as another teacher</summary>
            <div className="max-h-80 overflow-y-auto border-t border-rule">
              {teacherRows.map((t) => roleButton(t.id, t.name, "Teacher", "Teacher view"))}
            </div>
          </details>
          <p className="mt-6 text-sm text-ink-soft">
            Password sign-in opens when the administrator presses Go live. Go live removes all demo data and starts the real
            Week 10 schedule.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <div className="border border-rule bg-sheet">
          <div className="border-b border-rule px-6 py-5">
            <p className="label-caps">Teacher Observation Form</p>
            <h1 className="mt-1 font-cond text-2xl font-semibold text-navy">Sign in</h1>
          </div>
          <div className="px-6 py-6">
            <LoginForm />
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          Use the username and temporary password you were given. You will be asked to choose your own password the first
          time you sign in. If you have lost your password, ask the administrator to reset it.
        </p>
      </main>
    </>
  );
}
