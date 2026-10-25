import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, PageHeading } from "@/components/AppShell";
import { dayMonth } from "@/lib/dates";
import { levelLabel, roundLevel } from "@/lib/judgement";
import { getMode } from "@/lib/mode";
import { listPeer, peerMean, peerRaters } from "@/lib/peer";
import { requireUser } from "@/lib/session";
import { PeerUpload } from "./PeerUpload";

export const metadata: Metadata = { title: "Team leader observations" };

function describeDifference(d: number | null): string {
  if (d === null) return "Not enough overlap yet";
  const size = Math.abs(d);
  if (size < 0.25) return "In line with the coordinators";
  const amount = size < 0.75 ? "a little" : size < 1.5 ? "clearly" : "much";
  return d < 0 ? `Rates ${amount} more generously` : `Rates ${amount} more strictly`;
}

export default async function PeerPage() {
  const user = await requireUser(["ADMIN", "OBSERVER"]);
  const demo = (await getMode()) === "demo";
  const [rows, raters] = await Promise.all([listPeer(demo), peerRaters(demo)]);
  const toCheck = rows.filter((r) => r.status === "needs_check");
  return (
    <AppShell user={user} active="peer" wide>
      <PageHeading eyebrow="Separate from official observations" title="Team leader observations" />
      <p className="mt-4 max-w-3xl text-ink-soft">
        Observations by teachers who visit colleagues without an observer login. They are kept apart from Ms. Ayan&rsquo;s and
        Ms. Marwa&rsquo;s observations: they never count in the dashboard, experts, workshops or a teacher&rsquo;s own page.
        Only the coordinators and the administrator see them.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <section aria-labelledby="peer-list-h">
          <h2 id="peer-list-h" className="font-cond text-xl font-semibold text-navy">
            All team leader observations
          </h2>
          {toCheck.length > 0 ? (
            <p className="mt-1 text-sm font-medium text-navy">{toCheck.length} waiting to be checked against the original.</p>
          ) : null}
          {rows.length === 0 ? (
            <p className="mt-3 border-l-2 border-navy pl-3 text-ink-soft">
              None yet. Upload a completed form and it appears here once read.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto border border-rule bg-sheet">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="bg-navy text-left text-white">
                    {["Date", "Team leader", "Teacher observed", "Class · Subject", "Average given", "Status"].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 font-cond font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const m = peerMean(r);
                    return (
                      <tr key={r.id} className="border-t border-rule hover:bg-navy-wash">
                        <td className="whitespace-nowrap px-3 py-2">{r.date ? dayMonth(r.date) : "No date"}</td>
                        <td className="px-3 py-2">{r.observerName || "Unknown"}</td>
                        <td className="px-3 py-2">
                          <Link href={`/peer/${r.id}`} className="link">
                            {r.teacherName || "Unknown"}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{[r.className, r.subject].filter(Boolean).join(" · ")}</td>
                        <td className="px-3 py-2">{m === null ? "—" : `${levelLabel(roundLevel(m))} (${m.toFixed(2)})`}</td>
                        <td className="px-3 py-2">
                          {r.status === "confirmed" ? "Checked" : <span className="font-semibold text-navy">Check against original</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <PeerUpload sampleHref={demo ? "/api/peer/sample" : null} />
      </div>

      <section className="mt-12" aria-labelledby="raters-h">
        <h2 id="raters-h" className="font-cond text-xl font-semibold text-navy">
          How each team leader rates
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">
          Each team leader&rsquo;s checked ratings compared with Ms. Ayan&rsquo;s and Ms. Marwa&rsquo;s latest observation of the same
          teachers, criterion by criterion. Useful for moderation and for coaching team leaders.
        </p>
        {raters.length === 0 ? (
          <p className="mt-3 text-ink-soft">Appears once team leader observations have been checked.</p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-rule bg-sheet">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="bg-navy text-left text-white">
                  {["Team leader", "Observations", "Average level given", "Compared with the coordinators"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-cond font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {raters.map((r) => (
                  <tr key={r.observerTeacherId ?? r.observerName} className="border-t border-rule">
                    <td className="px-3 py-2">{r.observerName}</td>
                    <td className="px-3 py-2 font-mono">{r.count}</td>
                    <td className="px-3 py-2">{r.meanGiven === null ? "—" : `${levelLabel(roundLevel(r.meanGiven))} (${r.meanGiven.toFixed(2)})`}</td>
                    <td className="px-3 py-2">
                      {describeDifference(r.difference)}
                      {r.difference !== null ? (
                        <span className="block text-xs text-ink-faint">
                          {r.difference > 0 ? "+" : ""}
                          {r.difference.toFixed(2)} levels on average across {r.compared} shared ratings
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
