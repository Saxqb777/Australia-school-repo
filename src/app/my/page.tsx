import type { Metadata } from "next";
import Link from "next/link";
import { GuidedTour, ReplayTourButton } from "@/components/GuidedTour";
import { Masthead } from "@/components/Masthead";
import { requireUser } from "@/lib/session";
import { TEACHER_TOUR } from "@/lib/tours";

export const metadata: Metadata = { title: "My observations" };

export default async function TeacherHome() {
  const user = await requireUser(["TEACHER"]);
  return (
    <>
      <Masthead userName={user.name} roleLabel="Teacher" />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-end gap-3 border-b-2 border-navy pb-4">
          <div>
            <p className="label-caps">{user.name}</p>
            <h1 className="mt-1 font-cond text-3xl font-semibold text-navy">My observations</h1>
          </div>
          <span className="ml-auto" data-tour="replay">
            <ReplayTourButton />
          </span>
        </div>
        <div className="mt-8 max-w-xl border-l-2 border-navy pl-4">
          <h2 className="font-cond text-xl font-semibold">Nothing shared with you yet</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            After an observer completes your lesson observation and shares it, it will appear here with your ratings on the
            school&rsquo;s Teacher Observation Form and the observer&rsquo;s feedback. You will be able to sign it and write a
            short reflection in reply.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/change-password" className="link">
              Change my password
            </Link>
          </p>
        </div>
      </main>
      <GuidedTour tourKey="teacher" steps={TEACHER_TOUR} autoStart={!user.toursCompleted.includes("teacher")} />
    </>
  );
}
