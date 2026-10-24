import Link from "next/link";
import { Masthead } from "@/components/Masthead";

export default function NotFound() {
  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-xl px-4 py-16">
        <p className="label-caps">Not found</p>
        <h1 className="mt-1 font-cond text-2xl font-semibold text-navy">This page isn&rsquo;t available</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          The link may be mistyped, or the visit belongs to another observer. Observers can open only their own visits.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Go to my visits
        </Link>
      </main>
    </>
  );
}
