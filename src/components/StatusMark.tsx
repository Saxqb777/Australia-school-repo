import type { VisitStatus } from "@/lib/queries";

const LABELS: Record<VisitStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

/** Square status marker, styled like a box on the paper form: empty, half-filled, or ticked. */
export function StatusMark({ status, ratedCount, total = 20 }: { status: VisitStatus; ratedCount?: number; total?: number }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span
        aria-hidden
        className={`relative grid size-4 shrink-0 place-items-center border ${
          status === "not_started" ? "border-rule-strong" : "border-navy"
        } ${status === "complete" ? "bg-navy text-white" : "bg-sheet"}`}
      >
        {status === "in_progress" ? <span className="absolute inset-y-0 left-0 w-1/2 bg-navy" /> : null}
        {status === "complete" ? (
          <svg viewBox="0 0 12 12" className="size-3">
            <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        ) : null}
      </span>
      <span className={status === "not_started" ? "text-ink-soft" : "text-ink"}>
        {LABELS[status]}
        {status === "in_progress" && ratedCount !== undefined ? (
          <span className="font-mono text-xs text-ink-soft">
            {" "}
            {ratedCount}/{total}
          </span>
        ) : null}
      </span>
    </span>
  );
}
