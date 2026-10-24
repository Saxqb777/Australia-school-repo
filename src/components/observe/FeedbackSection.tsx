"use client";

import { useState } from "react";
import { IMPROVEMENTS_HEADING, STRENGTHS_HEADING } from "@/db/seed-data/rubric";
import { feedbackProblems, linesToList, wordCount } from "@/lib/feedback-checks";
import type { HeaderField, HeaderValues } from "@/lib/save-ops";

interface Props {
  visitId: string;
  header: HeaderValues;
  setHeaderField: (field: HeaderField, value: string) => void;
  locked: boolean;
  readOnly: boolean;
  ratedTotal: number;
  teacherName: string;
  observerName: string;
  flushNow: () => Promise<boolean>;
}

/** Areas of Strength, Suggested Areas for Improvement and the message to the teacher, drafted by AI and edited here. */
export function FeedbackSection({
  visitId,
  header,
  setHeaderField,
  locked,
  readOnly,
  ratedTotal,
  teacherName,
  observerName,
  flushNow,
}: Props) {
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const draft = {
    strengths: linesToList(header.strengthsText),
    improvements: linesToList(header.improvementsText),
    letter: header.feedbackText,
  };
  const anyText = header.strengthsText + header.improvementsText + header.feedbackText;
  const checks = anyText.trim() ? feedbackProblems(draft, teacherName, observerName) : [];
  const words = wordCount(header.feedbackText);

  async function write() {
    if (anyText.trim() && !window.confirm("Replace the text in these three boxes with a new AI draft?")) return;
    setWriting(true);
    setMessage(null);
    try {
      const sent = await flushNow();
      if (!sent) {
        setMessage("Your latest ratings are still on this device. Connect to the internet, then try again.");
        return;
      }
      const res = await fetch(`/api/visits/${visitId}/summary`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as
        | { ok: true; strengths: string; improvements: string; feedback: string; problems: string[] }
        | { ok: false; message: string }
        | null;
      if (!body || !body.ok) {
        setMessage(body && !body.ok ? body.message : "The summary could not be written. Try again in a minute.");
        return;
      }
      setHeaderField("strengthsText", body.strengths);
      setHeaderField("improvementsText", body.improvements);
      setHeaderField("feedbackText", body.feedback);
      setMessage(
        body.problems.length > 0
          ? "Draft written. A few points below need a quick edit before it is ready."
          : "Draft written from your ratings and comments. Read it through and edit anything you want.",
      );
    } catch {
      setMessage("You appear to be offline. The summary needs an internet connection.");
    } finally {
      setWriting(false);
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(header.feedbackText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      void fetch(`/api/visits/${visitId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delivered", channel: "copy" }),
      });
    } catch {
      setMessage("Copying is blocked in this browser. Select the message and copy it by hand.");
    }
  }

  const box = (field: HeaderField, label: string, hint: string, rows: number) => (
    <div>
      <label htmlFor={`field-${field}`} className="label-caps block">
        {label}
      </label>
      <p id={`hint-${field}`} className="mt-0.5 text-xs text-ink-soft">
        {hint}
      </p>
      <textarea
        id={`field-${field}`}
        className="field mt-1.5 resize-y leading-relaxed"
        rows={rows}
        value={header[field]}
        disabled={locked}
        aria-describedby={`hint-${field}`}
        onChange={(e) => setHeaderField(field, e.target.value)}
      />
    </div>
  );

  return (
    <section className="mt-10 scroll-mt-16" id="feedback" aria-labelledby="feedback-h" data-tour="feedback">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 id="feedback-h" className="font-cond text-xl font-semibold text-navy">
            Strengths, improvements and feedback
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            The AI drafts these from your ratings, the form&rsquo;s descriptors and your comments only. Nothing is sent
            until you share it.
          </p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            className="btn btn-primary ml-auto"
            disabled={locked || writing || ratedTotal < 10}
            onClick={() => void write()}
            data-tour="write-summary"
          >
            {writing ? "Writing…" : anyText.trim() ? "Write again with AI" : "Write summary with AI"}
          </button>
        ) : null}
      </div>
      {!readOnly && ratedTotal < 10 && !locked ? (
        <p className="mt-2 text-sm text-ink-soft">Rate at least 10 criteria and the AI can write a first draft.</p>
      ) : null}
      {message ? (
        <p role="status" className="mt-3 border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 border border-rule bg-sheet p-3 sm:grid-cols-2 sm:p-4">
        {box("strengthsText", STRENGTHS_HEADING, "3 to 5 lines, one per line.", 6)}
        {box("improvementsText", IMPROVEMENTS_HEADING, "2 to 4 actionable lines, one per line.", 6)}
        <div className="sm:col-span-2">
          {box("feedbackText", "Feedback message to the teacher", `150 to 220 words. Opens "Dear ${teacherName}," and closes "Kind regards," and your name.`, 12)}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
            <span className={`font-mono ${words > 0 && (words < 150 || words > 220) ? "text-navy underline" : "text-ink-soft"}`}>
              {words} words
            </span>
            {header.feedbackText.trim() ? (
              <button type="button" className="font-medium text-navy underline underline-offset-2" onClick={() => void copyMessage()}>
                {copied ? "Copied" : "Copy message"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {checks.length > 0 ? (
        <div className="mt-3 border border-dashed border-navy px-3 py-2 text-sm" role="note">
          <p className="font-medium text-navy">Before this is ready</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
