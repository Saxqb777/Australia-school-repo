"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DismissSteps() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="text-sm text-ink-soft underline underline-offset-2 hover:text-navy"
      onClick={() => {
        setBusy(true);
        void fetch("/api/tour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tour: "steps-dismissed" }),
        }).finally(() => router.refresh());
      }}
    >
      Close
    </button>
  );
}
