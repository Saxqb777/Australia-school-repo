"use client";

import { useState } from "react";
import { Bell, Sequence, useStep, useTypewriter } from "./stage-kit";

/** A notice arrives, and the observation appears on the teacher's page. */
export function TeacherNoticeStage() {
  const step = useStep([450, 1100]);
  return (
    <div>
      <p className="label-caps">Example</p>
      <Sequence show={step >= 1}>
        <div className="wl-drop mt-2 flex gap-3 border border-rule border-l-4 border-l-navy bg-sheet px-3 py-3 shadow-[0_8px_20px_rgba(6,38,61,0.12)]">
          <Bell count={1} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">New lesson feedback</p>
            <p className="text-ink-soft">Ms. Ayan has shared feedback on your English lesson with 4B.</p>
          </div>
        </div>
      </Sequence>
      <Sequence show={step >= 2}>
        <div className="wl-rise mt-3 flex items-center gap-3 border-y border-rule bg-sheet px-3 py-3 text-sm">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">English · 4B</span>
            <span className="block text-xs text-ink-soft">Ms. Ayan · Term 1, Week 10</span>
          </span>
          <span className="font-semibold text-navy">New: read and sign</span>
        </div>
      </Sequence>
    </div>
  );
}

const STRENGTH = {
  en: { heading: "Areas of Strength", text: "Your questions helped every student explain their thinking." },
  ar: { heading: "مجالات القوة", text: "ساعدت أسئلتك كل طالب على شرح طريقة تفكيره." },
};

/** The English and Arabic switch, to try. */
export function TeacherArabicStage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [tried, setTried] = useState(false);
  const t = STRENGTH[lang];
  return (
    <div>
      <div className={`inline-flex border border-navy ${tried ? "" : "wl-invite"}`} role="group" aria-label="Language">
        {(["en", "ar"] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => {
              setLang(l);
              setTried(true);
            }}
            className={`min-h-10 px-4 text-sm font-semibold ${lang === l ? "bg-navy text-white" : "bg-sheet text-navy hover:bg-navy-wash"}`}
          >
            {l === "en" ? "English" : <span lang="ar">عربي</span>}
          </button>
        ))}
      </div>
      <div key={lang} lang={lang === "ar" ? "ar" : "en-GB"} dir={lang === "ar" ? "rtl" : "ltr"} className="wl-rise mt-3 border border-rule bg-sheet px-4 py-3" aria-live="polite">
        <p className="label-caps !text-navy">{t.heading}</p>
        <p className="mt-1 text-[1.02rem] leading-relaxed">{t.text}</p>
      </div>
      {!tried ? (
        <p className="mt-2.5 text-sm font-medium text-navy">
          Try it: tap <span lang="ar">عربي</span>
        </p>
      ) : null}
    </div>
  );
}

/** Tap Sign: the stamp lands, then a one-line reflection writes itself. */
export function TeacherSignStage({ name }: { name: string }) {
  const [signedAt, setSignedAt] = useState<Date | null>(null);
  return (
    <div>
      <div className="flex min-h-[5.5rem] items-end gap-3 border border-rule bg-sheet px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="label-caps">Teacher&rsquo;s signature</p>
          {signedAt ? (
            <p className="wl-stamp mt-1.5 inline-block -rotate-2 border-2 border-navy px-2.5 py-1 font-cond text-sm font-semibold leading-tight text-navy">
              Signed electronically
              <span className="block font-sans text-xs font-normal">
                {name} · {signedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
              </span>
            </p>
          ) : (
            <div className="mt-6 border-b border-rule-strong" />
          )}
        </div>
        {!signedAt ? (
          <button type="button" className="btn btn-primary wl-invite !min-h-10" onClick={() => setSignedAt(new Date())}>
            Sign
          </button>
        ) : null}
      </div>
      {signedAt ? <Reflection /> : <p className="mt-2.5 text-sm font-medium text-navy">Try it: tap Sign</p>}
    </div>
  );
}

function Reflection() {
  const text = "Thank you. I will add short extension tasks for early finishers next week.";
  const typed = useTypewriter(text, 500, 22);
  return (
    <div className="wl-rise mt-3 border border-rule bg-sheet px-4 py-2.5 text-sm" style={{ animationDelay: "300ms" }}>
      <p className="label-caps">Your reflection</p>
      <p className="mt-1 min-h-[2.6rem] leading-relaxed" aria-label={text}>
        <span aria-hidden>{typed}</span>
        <span aria-hidden className="wl-caret ml-px inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-navy" />
      </p>
    </div>
  );
}
