"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Role } from "@/lib/session";
import { WELCOME_DONE, WELCOME_REPLAY } from "./events";
import { AdminGoLiveStage, AdminRolesStage, AdminSwitchStage, AdminExportStage } from "./admin-stages";
import { LetterStage, RateStage, ShareStage, WeekStage } from "./observer-stages";
import { TeacherArabicStage, TeacherNoticeStage, TeacherSignStage } from "./teacher-stages";
import type { WelcomeData } from "./types";

interface Scene {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Arabic for the teacher's story, shown under the English. */
  ar?: { title: string; body: string };
  note?: string;
  stage: React.ReactNode;
}

const EMPTY: WelcomeData = { week: null, criterion: null, firstVisitHref: null, example: null };

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function scenesFor(role: Role, name: string, demo: boolean, data: WelcomeData, loading: boolean): Scene[] {
  if (role === "OBSERVER") {
    return [
      {
        key: "week",
        eyebrow: "Your week",
        title: `${greeting()}, ${name}.`,
        body: "Your visits are ready, with the teacher, class and subject already filled in.",
        stage: <WeekStage week={data.week} loading={loading} />,
      },
      {
        key: "rate",
        eyebrow: "Rating",
        title: "Tap to rate.",
        body: "The same six columns as the paper form. Its exact words appear as you tap.",
        stage: <RateStage criterion={data.criterion} loading={loading} />,
      },
      {
        key: "letter",
        eyebrow: "Feedback",
        title: "The AI drafts the letter.",
        body: "Written only from your ratings and comments. You check it and change any word.",
        stage: <LetterStage example={data.example} observerName={name} />,
      },
      {
        key: "share",
        eyebrow: "Sharing",
        title: "Share it. It's already saved.",
        body: "Every tap saves itself, even with no signal. One tap sends it to the teacher.",
        note: "You also see the whole school: Register, Dashboard and Team leader observations.",
        stage: <ShareStage example={data.example} observerName={name} />,
      },
    ];
  }
  if (role === "TEACHER") {
    return [
      {
        key: "notice",
        eyebrow: `Welcome, ${name}`,
        title: "Your feedback arrives here.",
        body: "When your lesson observation is shared, you get a notice and it appears on your page.",
        ar: { title: "تصل ملاحظات دروسك إلى هنا.", body: "عند مشاركة ملاحظة درسك يصلك إشعار، وتظهر في صفحتك." },
        stage: <TeacherNoticeStage />,
      },
      {
        key: "arabic",
        eyebrow: "Reading",
        title: "In English or Arabic.",
        body: "One tap shows the feedback in Arabic. The form's own wording stays in English.",
        ar: { title: "بالإنجليزية أو بالعربية.", body: "بضغطة واحدة تظهر الملاحظات بالعربية، وتبقى عبارات النموذج بالإنجليزية." },
        stage: <TeacherArabicStage />,
      },
      {
        key: "sign",
        eyebrow: "Replying",
        title: "Sign it and reply.",
        body: "Sign electronically and write a short reflection. Your observer sees it straight away.",
        ar: { title: "التوقيع والرد.", body: "توقيع إلكتروني وتأمل قصير يصلان فوراً إلى من قام بالملاحظة." },
        stage: <TeacherSignStage name={name} />,
      },
    ];
  }
  return [
    {
      key: "roles",
      eyebrow: "Who sees what",
      title: "Welcome, Administrator.",
      body: "Everyone sees only what they need. You see everything.",
      stage: <AdminRolesStage />,
    },
    demo
      ? {
          key: "switch",
          eyebrow: "Presenting",
          title: "See it through their eyes.",
          body: "Switch role, in the blue banner, shows exactly what Ms. Ayan or any teacher sees.",
          stage: <AdminSwitchStage />,
        }
      : {
          key: "export",
          eyebrow: "Your data",
          title: "Take a copy any time.",
          body: "Every list downloads as Excel or CSV. Passwords never do.",
          stage: <AdminExportStage />,
        },
    ...(demo
      ? [
          {
            key: "golive",
            eyebrow: "When the school is ready",
            title: "Go live in one step.",
            body: "Type GO LIVE to delete the demo and open real sign-in with the Week 10 schedule.",
            stage: <AdminGoLiveStage />,
          },
        ]
      : []),
  ];
}

function finalAction(role: Role, data: WelcomeData): { href: string; label: string } {
  if (role === "OBSERVER") return data.firstVisitHref ? { href: data.firstVisitHref, label: "Open my next visit" } : { href: "/visits", label: "Open my visits" };
  if (role === "TEACHER") return { href: "/my", label: "See my observations" };
  return { href: "/admin", label: "Open the register" };
}

/**
 * A short full-screen story, once per person on first sign-in: three or four scenes, each one idea, each with a
 * small live demonstration built from the real form. "Watch the intro" in any page guide plays it again.
 */
export function WelcomeStory({ role, name, demo, autoStart }: { role: Role; name: string; demo: boolean; autoStart: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [loadedData, setData] = useState<WelcomeData | null>(null);
  const loaded = useRef(false);
  const touchX = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  const show = useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (autoStart) {
      document.documentElement.dataset.welcome = "open";
      setOpen(true);
    }
    window.addEventListener(WELCOME_REPLAY, show);
    return () => window.removeEventListener(WELCOME_REPLAY, show);
  }, [autoStart, show]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.dataset.welcome = "open";
    if (!loaded.current && role === "OBSERVER") {
      loaded.current = true;
      void fetch("/api/welcome")
        .then((r) => (r.ok ? (r.json() as Promise<WelcomeData>) : EMPTY))
        .then(setData)
        .catch(() => undefined);
    }
  }, [open, role]);

  const close = useCallback(() => {
    setOpen(false);
    delete document.documentElement.dataset.welcome;
    window.dispatchEvent(new Event(WELCOME_DONE));
    void fetch("/api/tour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tour: "welcome" }),
    }).catch(() => undefined);
  }, []);

  const data = loadedData ?? EMPTY;
  const scenes = scenesFor(role, name, demo, data, role === "OBSERVER" && loadedData === null);
  const scene = scenes[index];
  const last = index === scenes.length - 1;

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, scenes.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, scenes.length]);

  // Swipe left or right on a phone to move between scenes.
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchX.current;
    const endX = e.changedTouches[0]?.clientX;
    touchX.current = null;
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 60) return;
    setIndex((i) => (endX < startX ? Math.min(i + 1, scenes.length - 1) : Math.max(i - 1, 0)));
  };

  if (!mounted || !open || !scene) return null;
  const action = finalAction(role, data);

  return (
    <div className="wl-backdrop fixed inset-0 z-[60] grid bg-navy-deep/85 sm:place-items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="wl-sheet flex h-full w-full flex-col overflow-hidden border-t-4 border-t-navy bg-sheet sm:h-auto sm:max-h-[min(46rem,100%)] sm:max-w-[34rem] sm:shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
      >
        <header className="flex items-center gap-3 border-b border-rule px-5 py-3">
          <Image src="/crest.png" alt="" width={26} height={24} />
          <span className="label-caps !text-navy">Observation Hub</span>
          <button type="button" onClick={close} className="ml-auto text-sm text-ink-soft underline underline-offset-2 hover:text-navy">
            Skip intro
          </button>
        </header>

        <div key={scene.key} className="wl-stage relative flex min-h-[15.5rem] flex-1 flex-col justify-center overflow-hidden border-b border-rule bg-paper px-5 py-5 sm:flex-none">
          {scene.stage}
        </div>

        <div key={`t-${scene.key}`} className="wl-copy flex-none overflow-y-auto px-5 pb-3 pt-5">
          <p className="label-caps">{scene.eyebrow}</p>
          <h2 ref={headingRef} id={headingId} tabIndex={-1} className="mt-1.5 font-cond text-[2rem] font-semibold leading-[1.05] text-navy outline-none sm:text-[2.2rem]">
            {scene.title.replace(/\b(Ms\.|Mr\.|Mrs\.) /g, "$1\u00a0")}
          </h2>
          <p className="mt-2.5 text-[1.05rem] leading-relaxed text-ink">{scene.body}</p>
          {scene.ar ? (
            <div lang="ar" dir="rtl" className="mt-3 border-r-2 border-navy pr-3">
              <p className="text-lg font-semibold leading-snug text-navy">{scene.ar.title}</p>
              <p className="mt-0.5 leading-relaxed text-ink-soft">{scene.ar.body}</p>
            </div>
          ) : null}
          {scene.note && role === "OBSERVER" ? <p className="mt-3 text-sm text-ink-soft">{scene.note}</p> : null}
        </div>

        <footer className="flex items-center gap-3 border-t border-rule px-5 py-4">
          <ol className="flex gap-1.5" aria-label={`Part ${index + 1} of ${scenes.length}`}>
            {scenes.map((s, i) => (
              <li key={s.key} aria-hidden>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setIndex(i)}
                  className={`grid size-[1.1rem] place-items-center border transition-colors ${
                    i < index ? "border-navy bg-navy text-white" : i === index ? "border-navy bg-sheet" : "border-rule-strong bg-sheet"
                  }`}
                >
                  {i < index ? (
                    <svg viewBox="0 0 12 12" className="size-2.5">
                      <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  ) : i === index ? (
                    <span className="size-1.5 bg-navy" />
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
          <div className="ml-auto flex items-center gap-2">
            {index > 0 ? (
              <button type="button" className="btn btn-quiet !hidden !min-h-11 sm:!inline-flex" onClick={() => setIndex(index - 1)}>
                Back
              </button>
            ) : null}
            {last ? (
              <Link href={action.href} className="btn btn-primary !min-h-11" onClick={close}>
                {action.label}
              </Link>
            ) : (
              <button type="button" className="btn btn-primary !min-h-11 min-w-28" onClick={() => setIndex(index + 1)}>
                Next
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                  <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
