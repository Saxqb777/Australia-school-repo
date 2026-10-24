"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { when } from "@/components/observe/SharePanel";
import { levelLabel, type Level } from "@/lib/judgement";
import { TEACHER_STRINGS, type TeacherLang } from "@/lib/i18n/teacher";

interface Props {
  visitId: string;
  observerName: string;
  lessonLabel: string;
  dateLabel: string;
  overall: Level | null;
  areas: { id: number; label: string; level: Level | null }[];
  criteria: { id: number; code: string; name: string; level: Level | null; descriptor: string; comment: string }[];
  english: { strengths: string; improvements: string; feedback: string };
  signedAt: string | null;
  reflection: string;
}

/** The teacher's view of a shared observation: feedback, signature, reflection, and an Arabic toggle. */
export function TeacherFeedback(props: Props) {
  const [lang, setLang] = useState<TeacherLang>("en");
  const [arabic, setArabic] = useState<Props["english"] | null>(null);
  const [translating, setTranslating] = useState(false);
  const [signedAt, setSignedAt] = useState(props.signedAt);
  const [signing, setSigning] = useState(false);
  const [reflection, setReflection] = useState(props.reflection);
  const [savedReflection, setSavedReflection] = useState(props.reflection);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const t = TEACHER_STRINGS[lang];
  const text = lang === "ar" && arabic ? arabic : props.english;

  useEffect(() => {
    void fetch(`/api/visits/${props.visitId}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "opened" }),
    });
  }, [props.visitId]);

  async function toggleLanguage() {
    if (lang === "ar") return setLang("en");
    if (arabic) return setLang("ar");
    setTranslating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/visits/${props.visitId}/arabic`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as
        | { ok: true; strengths: string; improvements: string; feedback: string }
        | { ok: false; message: string }
        | null;
      if (!body || !body.ok) {
        setMessage(body && !body.ok ? body.message : "The Arabic version could not be made right now.");
        return;
      }
      setArabic({ strengths: body.strengths, improvements: body.improvements, feedback: body.feedback });
      setLang("ar");
    } finally {
      setTranslating(false);
    }
  }

  async function post(payload: object): Promise<{ ok: boolean; message?: string; signedAt?: string }> {
    try {
      const res = await fetch(`/api/visits/${props.visitId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return ((await res.json().catch(() => null)) as { ok: boolean; message?: string; signedAt?: string } | null) ?? { ok: false };
    } catch {
      return { ok: false, message: "You appear to be offline. Connect to the internet, then try again." };
    }
  }

  async function sign() {
    setSigning(true);
    const r = await post({ action: "sign_teacher" });
    setSigning(false);
    if (r.ok) setSignedAt(r.signedAt ?? new Date().toISOString());
    else setMessage(r.message ?? "That didn't go through. Try again.");
  }

  async function sendReflection() {
    setSending(true);
    const r = await post({ action: "reflection", text: reflection });
    setSending(false);
    if (r.ok) setSavedReflection(reflection);
    else setMessage(r.message ?? "That didn't go through. Try again.");
  }

  const list = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  return (
    <div lang={lang === "ar" ? "ar" : "en-GB"} dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-end gap-3 border-b-2 border-navy pb-4">
        <div className="min-w-0">
          <Link href="/my" className="label-caps hover:text-navy">
            {t.back}
          </Link>
          <h1 className="mt-1 font-cond text-3xl font-semibold text-navy">
            {t.feedbackFrom} {props.observerName}
          </h1>
          <p className="mt-1 text-ink-soft" dir="ltr">
            {props.lessonLabel} · {props.dateLabel}
          </p>
        </div>
        <div className="ms-auto flex gap-2" dir="ltr">
          <button type="button" className="btn btn-quiet" onClick={() => void toggleLanguage()} disabled={translating} aria-pressed={lang === "ar"}>
            {translating ? t.translating : lang === "ar" ? TEACHER_STRINGS.en.english : TEACHER_STRINGS.en.translate}
          </button>
          <a href={`/api/visits/${props.visitId}/pdf`} target="_blank" rel="noopener" className="btn btn-quiet">
            PDF
          </a>
        </div>
      </div>

      {message ? (
        <p role="alert" className="mt-4 border-s-2 border-navy bg-navy-wash px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="border border-rule bg-sheet p-4 sm:p-6">
            <h2 className="label-caps">{t.message}</h2>
            <div className="mt-3 space-y-3 text-[1.02rem] leading-relaxed">
              {text.feedback.split(/\n{2,}/).map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p.trim()}
                </p>
              ))}
            </div>
          </div>
          <div className="grid border border-rule bg-sheet sm:grid-cols-2">
            <div className="border-rule p-4 max-sm:border-b sm:border-e">
              <h2 className="label-caps">{t.strengths}</h2>
              <ul className="mt-2 list-disc space-y-1.5 ps-5">
                {list(text.strengths).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div className="p-4">
              <h2 className="label-caps">{t.improvements}</h2>
              <ul className="mt-2 list-disc space-y-1.5 ps-5">
                {list(text.improvements).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="border border-rule bg-sheet">
            <h2 className="bg-navy px-3 py-2 font-cond text-sm font-semibold uppercase tracking-wider text-white">{t.overall}</h2>
            <table className="w-full text-sm" dir="ltr">
              <tbody>
                {props.areas.map((a) => (
                  <tr key={a.id} className="border-b border-rule">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      {a.label}
                    </th>
                    <td className="px-3 py-2 text-right font-medium">{a.level ? levelLabel(a.level) : "—"}</td>
                  </tr>
                ))}
                <tr className="bg-navy-wash">
                  <th scope="row" className="px-3 py-2 text-left font-semibold">
                    Overall Lesson Judgement
                  </th>
                  <td className="px-3 py-2 text-right font-semibold">{props.overall ? levelLabel(props.overall) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-rule bg-sheet p-4" data-tour="teacher-sign">
            {signedAt ? (
              <p className="inline-block border border-navy px-2 py-1 text-sm text-navy">
                {t.signed} · <span dir="ltr">{when(signedAt)}</span>
              </p>
            ) : (
              <>
                <button type="button" className="btn btn-primary w-full" disabled={signing} onClick={() => void sign()}>
                  {signing ? t.signing : t.sign}
                </button>
                <p className="mt-2 text-xs text-ink-soft">{t.signNote}</p>
              </>
            )}
          </div>

          <div className="border border-rule bg-sheet p-4">
            <label htmlFor="reflection" className="label-caps block">
              {t.reflection}
            </label>
            <p className="mt-0.5 text-xs text-ink-soft">{t.reflectionNote}</p>
            <textarea id="reflection" className="field mt-2 min-h-28" value={reflection} maxLength={3000} onChange={(e) => setReflection(e.target.value)} />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                className="btn btn-quiet"
                disabled={sending || reflection.trim() === "" || reflection === savedReflection}
                onClick={() => void sendReflection()}
              >
                {sending ? t.sending : savedReflection ? t.update : t.send}
              </button>
              {savedReflection && reflection === savedReflection ? <span className="text-sm text-ink-soft">{t.sent}</span> : null}
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-10" dir="ltr" lang="en-GB">
        <h2 className="font-cond text-xl font-semibold text-navy">{t.ratings}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t.ratingsNote}</p>
        <ol className="mt-3 border border-rule bg-sheet">
          {props.criteria.map((c) => (
            <li key={c.id} className="border-b border-rule px-3 py-3 last:border-b-0 sm:px-4">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-mono text-sm text-ink-faint">{c.code}</span>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="font-cond font-semibold text-navy">{c.level ? levelLabel(c.level) : "Not rated"}</span>
              </div>
              {c.descriptor ? <p className="mt-1 border-l-2 border-navy pl-3 text-sm leading-relaxed">{c.descriptor}</p> : null}
              {c.comment ? <p className="mt-1.5 text-sm text-ink-soft">Comment: {c.comment}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
