import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { getCurrentUser } from "@/lib/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Choose a password" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <>
      <Masthead userName={user.name} />
      <main className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <div className="border border-rule bg-sheet">
          <div className="border-b border-rule px-6 py-5">
            <p className="label-caps">{user.name}</p>
            <h1 className="mt-1 font-cond text-2xl font-semibold text-navy">
              {user.mustChangePassword ? "Choose your own password" : "Change password"}
            </h1>
          </div>
          <div className="px-6 py-6">
            {user.mustChangePassword ? (
              <p className="mb-5 text-sm leading-relaxed text-ink-soft">
                You signed in with a temporary password. Replace it with one only you know before continuing.
              </p>
            ) : null}
            <ChangePasswordForm />
          </div>
        </div>
      </main>
    </>
  );
}
