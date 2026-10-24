import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { getCurrentUser, homePathFor } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : homePathFor(user.role));
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
          Use the username and temporary password you were given. You will be asked to choose your own password
          the first time you sign in. If you have lost your password, ask the administrator to reset it.
        </p>
      </main>
    </>
  );
}
