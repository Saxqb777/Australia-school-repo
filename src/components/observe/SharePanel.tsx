"use client";

import { useState } from "react";

interface Props {
  visitId: string;
  teacherName: string;
  readOnly: boolean;
  initial: {
    sharedAt: string | null;
    openedAt: string | null;
    signedByTeacherAt: string | null;
    signedByTeacherName: string | null;
    signedByCoordinatorAt: string | null;
    signedByCoordinatorName: string | null;
    reflection: { text: string; updatedAt: string } | null;
  };
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  });
}

/** After completion: the PDF, the coordinator's e-signature, sharing with the teacher, and the teacher's reply. */
export function SharePanel({ visitId, teacherName, readOnly, initial }: Props) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: "share" | "unshare" | "sign_coordinator") {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok: true; sharedAt?: string; signedAt?: string; name?: string }
        | { ok: false; message: string }
        | null;
      if (!body || !body.ok) {
        setMessage(body && !body.ok ? body.message : "That didn't go through. Check your connection and try again.");
        return;
      }
      if (action === "share") setState((s) => ({ ...s, sharedAt: body.sharedAt ?? new Date().toISOString() }));
      if (action === "unshare") setState((s) => ({ ...s, sharedAt: null }));
      if (action === "sign_coordinator") {
        setState((s) => ({ ...s, signedByCoordinatorAt: body.signedAt ?? null, signedByCoordinatorName: body.name ?? null }));
      }
    } catch {
      setMessage("You appear to be offline. Connect to the internet, then try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 space-y-4" data-tour="share">
      <div className="grid border border-rule bg-sheet sm:grid-cols-3">
        <div className="border-rule p-3 max-sm:border-b sm:border-r">
          <p className="label-caps">Official form</p>
          <a
            href={`/api/visits/${visitId}/pdf`}
            target="_blank"
            rel="noopener"
            className="btn btn-quiet mt-2 !min-h-10"
            onClick={() =>
              void fetch(`/api/visits/${visitId}/lifecycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delivered", channel: "pdf" }),
              })
            }
          >
            Open PDF
          </a>
        </div>
        <div className="border-rule p-3 max-sm:border-b sm:border-r">
          <p className="label-caps">Coordinator signature</p>
          {state.signedByCoordinatorAt ? (
            <p className="mt-2 inline-block border border-navy px-2 py-1 text-xs text-navy">
              Signed electronically by {state.signedByCoordinatorName} · {when(state.signedByCoordinatorAt)}
            </p>
          ) : readOnly ? (
            <p className="mt-2 text-sm text-ink-soft">Not signed yet.</p>
          ) : (
            <button type="button" className="btn btn-quiet mt-2 !min-h-10" disabled={busy !== null} onClick={() => void act("sign_coordinator")}>
              {busy === "sign_coordinator" ? "Signing…" : "Sign electronically"}
            </button>
          )}
        </div>
        <div className="p-3">
          <p className="label-caps">Teacher</p>
          {state.sharedAt ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>Shared {when(state.sharedAt)}</p>
              <p className="text-ink-soft">{state.openedAt ? `Opened ${when(state.openedAt)}` : "Not opened yet"}</p>
              {state.signedByTeacherAt ? (
                <p className="inline-block border border-navy px-2 py-1 text-xs text-navy">
                  Signed electronically by {state.signedByTeacherName} · {when(state.signedByTeacherAt)}
                </p>
              ) : !readOnly ? (
                <button type="button" className="text-sm text-ink-soft underline underline-offset-2" disabled={busy !== null} onClick={() => void act("unshare")}>
                  Withdraw
                </button>
              ) : null}
            </div>
          ) : readOnly ? (
            <p className="mt-2 text-sm text-ink-soft">Not shared yet.</p>
          ) : (
            <button type="button" className="btn btn-primary mt-2 !min-h-10" disabled={busy !== null} onClick={() => void act("share")}>
              {busy === "share" ? "Sharing…" : `Share with ${teacherName}`}
            </button>
          )}
        </div>
      </div>
      {message ? (
        <p role="alert" className="border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}
      <div id="reflection" className="scroll-mt-16 border-l-2 border-navy pl-3">
        <p className="label-caps">Teacher&rsquo;s reflection</p>
        {state.reflection ? (
          <>
            <p className="mt-1 whitespace-pre-line leading-relaxed">{state.reflection.text}</p>
            <p className="mt-1 text-xs text-ink-soft">{when(state.reflection.updatedAt)}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">
            {state.sharedAt
              ? `${teacherName} can reply from their page. Their reflection will appear here.`
              : `Once shared, ${teacherName} can read the feedback, sign it and write a short reflection that appears here.`}
          </p>
        )}
      </div>
    </div>
  );
}
