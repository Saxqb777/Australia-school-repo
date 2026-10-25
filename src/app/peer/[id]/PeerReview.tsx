"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RatingStrip } from "@/components/observe/RatingStrip";
import { RATING_LEVELS } from "@/db/seed-data/rubric";
import { isLevel, levelLabel, type Level } from "@/lib/judgement";

interface Criterion {
  id: number;
  code: string;
  name: string;
  areaName: string;
  descriptors: Record<Level, string>;
}

interface Initial {
  observerTeacherId: string | null;
  observerName: string;
  teacherId: string | null;
  teacherName: string;
  className: string;
  subject: string;
  date: string;
  period: string;
  topic: string;
  ratings: Record<string, number>;
  comments: Record<string, string>;
  strengths: string;
  improvements: string;
  overallLevel: number | null;
}

interface Props {
  id: string;
  status: "needs_check" | "confirmed";
  uncertain: string[];
  fileUrl: string | null;
  fileIsPdf: boolean;
  people: { id: string; name: string }[];
  criteria: Criterion[];
  initial: Initial;
}

/** Check what the AI read against the original, correct anything, then confirm. */
export function PeerReview({ id, status, uncertain, fileUrl, fileIsPdf, people, criteria, initial }: Props) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(status);
  const set = <K extends keyof Initial>(k: K, value: Initial[K]) => setV((s) => ({ ...s, [k]: value }));
  const flaggedCodes = new Set(uncertain.flatMap((u) => u.match(/\b\d\.\d\b/g) ?? []));

  async function submit(action: "save" | "confirm") {
    setBusy(action);
    setMessage(null);
    try {
      const period = Number.parseInt(v.period, 10);
      const res = await fetch(`/api/peer/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          observerTeacherId: v.observerTeacherId,
          observerName: v.observerTeacherId ? (people.find((p) => p.id === v.observerTeacherId)?.name ?? v.observerName) : v.observerName,
          teacherId: v.teacherId,
          teacherName: v.teacherId ? (people.find((p) => p.id === v.teacherId)?.name ?? v.teacherName) : v.teacherName,
          className: v.className.trim() || null,
          subject: v.subject.trim() || null,
          date: v.date || null,
          period: Number.isNaN(period) ? null : period,
          topic: v.topic.trim() || null,
          ratings: v.ratings,
          comments: Object.fromEntries(Object.entries(v.comments).filter(([, t]) => t.trim())),
          strengths: v.strengths.trim() || null,
          improvements: v.improvements.trim() || null,
          overallLevel: v.overallLevel,
        }),
      });
      const out = (await res.json().catch(() => null)) as { ok: boolean; message?: string; status?: "needs_check" | "confirmed" } | null;
      if (!out?.ok) {
        setMessage(out?.message ?? "That didn't save. Try again.");
        return;
      }
      setSaved(out.status ?? saved);
      setMessage(action === "confirm" ? "Checked and saved." : "Saved.");
      router.refresh();
    } catch {
      setMessage("You appear to be offline. Saving needs an internet connection.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this team leader observation and its original file?")) return;
    const res = await fetch(`/api/peer/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/peer");
  }

  const personSelect = (label: string, idKey: "observerTeacherId" | "teacherId", nameKey: "observerName" | "teacherName") => (
    <label className="block text-xs text-ink-soft">
      {label}
      <select
        className="field !py-2"
        value={v[idKey] ?? ""}
        onChange={(e) => set(idKey, e.target.value || null)}
      >
        <option value="">{v[nameKey] ? `Not matched: "${v[nameKey]}"` : "Choose"}</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );

  const text = (label: string, key: "className" | "subject" | "topic" | "period", type = "text") => (
    <label className="block text-xs text-ink-soft">
      {label}
      <input type={type} className="field !py-2" value={v[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  );

  let lastArea = "";
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section aria-label="Original form" className="xl:sticky xl:top-4 xl:self-start">
        <div className="flex items-baseline gap-3">
          <h2 className="label-caps">Original as handed in</h2>
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noopener" className="ml-auto text-sm font-medium text-navy underline underline-offset-2">
              Open in a new tab
            </a>
          ) : null}
        </div>
        {fileUrl ? (
          fileIsPdf ? (
            <object data={fileUrl} type="application/pdf" className="mt-2 h-[80vh] w-full border border-rule bg-sheet">
              <a href={fileUrl} className="link">
                Open the original PDF
              </a>
            </object>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt="The completed form as handed in" className="mt-2 w-full border border-rule bg-sheet" />
          )
        ) : (
          <p className="mt-2 border-l-2 border-navy pl-3 text-sm text-ink-soft">Sample record: there is no original file.</p>
        )}
      </section>

      <section aria-label="What was read">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="label-caps">What was read</h2>
          <span className={`ml-auto text-sm ${saved === "confirmed" ? "text-ink-soft" : "font-semibold text-navy"}`}>
            {saved === "confirmed" ? "Checked" : "Waiting to be checked"}
          </span>
        </div>
        {uncertain.length > 0 && saved !== "confirmed" ? (
          <div className="mt-2 border border-dashed border-navy px-3 py-2 text-sm" role="note">
            <p className="font-medium text-navy">Check these against the original</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {uncertain.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-3 grid gap-2 border border-rule bg-sheet p-3 sm:grid-cols-2">
          {personSelect("Team leader", "observerTeacherId", "observerName")}
          {personSelect("Teacher observed", "teacherId", "teacherName")}
          {text("Class", "className")}
          {text("Subject", "subject")}
          <label className="block text-xs text-ink-soft">
            Date of observation
            <input type="date" className="field !py-2" value={v.date} onChange={(e) => set("date", e.target.value)} />
          </label>
          {text("Period", "period")}
          <div className="sm:col-span-2">{text("Topic", "topic")}</div>
        </div>

        <ol className="mt-4 border border-rule bg-sheet">
          {criteria.map((c) => {
            const level = v.ratings[String(c.id)];
            const showArea = c.areaName !== lastArea;
            lastArea = c.areaName;
            const flagged = flaggedCodes.has(c.code);
            return (
              <li key={c.id} className={`border-b border-rule px-3 py-3 last:border-b-0 ${flagged && saved !== "confirmed" ? "bg-navy-wash" : ""}`}>
                {showArea ? <p className="label-caps mb-2 !text-navy">{c.areaName}</p> : null}
                <p className="flex gap-2 text-sm">
                  <span className="font-mono text-ink-faint">{c.code}</span>
                  <span className="font-medium">{c.name}</span>
                  {flagged && saved !== "confirmed" ? <span className="ml-auto text-xs font-semibold text-navy">Check</span> : null}
                </p>
                <div className="mt-2">
                  <RatingStrip
                    name={`peer-${c.id}`}
                    legend={`${c.code} ${c.name}`}
                    value={isLevel(level) ? level : null}
                    disabled={false}
                    onChange={(l) =>
                      setV((s) => {
                        const ratings = { ...s.ratings };
                        if (l) ratings[String(c.id)] = l;
                        else delete ratings[String(c.id)];
                        return { ...s, ratings };
                      })
                    }
                  />
                </div>
                {isLevel(level) ? <p className="mt-1.5 text-xs text-ink-soft">{levelLabel(level)}: {c.descriptors[level]}</p> : null}
                <input
                  className="field mt-2 !py-1.5 !text-sm"
                  placeholder="Comment, if the team leader wrote one"
                  aria-label={`Comment for ${c.code}`}
                  value={v.comments[String(c.id)] ?? ""}
                  onChange={(e) => setV((s) => ({ ...s, comments: { ...s.comments, [String(c.id)]: e.target.value } }))}
                />
              </li>
            );
          })}
        </ol>

        <div className="mt-4 grid gap-3 border border-rule bg-sheet p-3 sm:grid-cols-2">
          <label className="block text-xs text-ink-soft">
            Areas of Strength
            <textarea className="field min-h-24" value={v.strengths} onChange={(e) => set("strengths", e.target.value)} />
          </label>
          <label className="block text-xs text-ink-soft">
            Suggested Areas for Improvement
            <textarea className="field min-h-24" value={v.improvements} onChange={(e) => set("improvements", e.target.value)} />
          </label>
          <label className="block text-xs text-ink-soft">
            Overall Lesson Judgement (as written by the team leader)
            <select className="field !py-2" value={v.overallLevel ?? ""} onChange={(e) => set("overallLevel", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Not given</option>
              {RATING_LEVELS.map((l) => (
                <option key={l.level} value={l.level}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {message ? (
          <p role="status" className="mt-3 border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => void submit("confirm")}>
            {busy === "confirm" ? "Saving…" : saved === "confirmed" ? "Save changes" : "Checked: confirm and save"}
          </button>
          <button type="button" className="btn btn-quiet" disabled={busy !== null} onClick={() => void submit("save")}>
            {busy === "save" ? "Saving…" : "Save and check later"}
          </button>
          <button type="button" className="ml-auto text-sm text-ink-soft underline underline-offset-2" onClick={() => void remove()}>
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}
