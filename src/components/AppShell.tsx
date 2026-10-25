import Image from "next/image";
import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { logoutAction } from "@/app/actions/auth-actions";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getMode } from "@/lib/mode";
import { ROLE_LABEL, homePathFor, type CurrentUser } from "@/lib/session";
import { WelcomeStory } from "./welcome/WelcomeStory";

type NavKey =
  | "visits"
  | "register"
  | "dashboard"
  | "workshops"
  | "teachers"
  | "setup"
  | "audit"
  | "peer"
  | "my"
  | "my-workshops"
  | "notifications";

const NAV: Record<CurrentUser["role"], { key: NavKey; label: string; href: string }[]> = {
  OBSERVER: [
    { key: "visits", label: "My visits", href: "/visits" },
    { key: "register", label: "Register", href: "/admin" },
    { key: "dashboard", label: "Dashboard", href: "/dashboard" },
    { key: "peer", label: "Team leader observations", href: "/peer" },
    { key: "workshops", label: "Workshops", href: "/workshops" },
    { key: "teachers", label: "Teachers", href: "/teachers" },
    { key: "setup", label: "Setup", href: "/admin/setup" },
    { key: "audit", label: "Audit log", href: "/admin/audit" },
  ],
  ADMIN: [
    { key: "register", label: "Register", href: "/admin" },
    { key: "dashboard", label: "Dashboard", href: "/dashboard" },
    { key: "peer", label: "Team leader observations", href: "/peer" },
    { key: "workshops", label: "Workshops", href: "/workshops" },
    { key: "teachers", label: "Teachers", href: "/teachers" },
    { key: "setup", label: "Setup", href: "/admin/setup" },
    { key: "audit", label: "Audit log", href: "/admin/audit" },
  ],
  TEACHER: [
    { key: "my", label: "My observations", href: "/my" },
    { key: "my-workshops", label: "My workshops", href: "/my/workshops" },
  ],
};

export async function AppShell({
  user,
  active,
  children,
  wide = false,
}: {
  user: CurrentUser;
  active: NavKey;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const mode = await getMode();
  const [unread] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt), eq(notifications.isDemo, mode === "demo")));
  const unreadCount = unread?.n ?? 0;
  const width = wide ? "max-w-7xl" : "max-w-5xl";
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-sheet focus:p-2">
        Skip to content
      </a>
      {mode === "demo" ? <DemoBanner user={user} /> : null}
      <header className="border-b border-rule bg-sheet">
        <div className={`mx-auto flex ${width} items-center gap-3 px-4 py-3 sm:px-6`}>
          <Link href={homePathFor(user.role)} className="flex min-w-0 items-center gap-3">
            <Image src="/crest.png" alt="" width={34} height={31} priority className="shrink-0" />
            <span className="min-w-0">
              <span className="label-caps block truncate !text-[0.66rem]">Australian School of Abu Dhabi</span>
              <span className="block truncate font-cond text-[1.05rem] font-semibold leading-tight text-navy">Observation Hub</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-right">
            <Link
              href="/notifications"
              className={`relative grid size-10 place-items-center hover:bg-navy-wash ${active === "notifications" ? "bg-navy-wash" : ""}`}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            >
              <svg viewBox="0 0 20 20" className="size-5 text-navy" aria-hidden>
                <path d="M10 3a4.5 4.5 0 0 0-4.5 4.5v3L4 13h12l-1.5-2.5v-3A4.5 4.5 0 0 0 10 3Zm-1.8 12a1.8 1.8 0 0 0 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 min-w-4 bg-navy px-1 font-mono text-[0.6rem] leading-4 text-white">{unreadCount}</span>
              ) : null}
            </Link>
            <span className="hidden sm:block">
              <span className="block text-sm font-medium leading-tight">{user.name}</span>
              <span className="label-caps block !text-[0.62rem]">{ROLE_LABEL[user.role]}</span>
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-quiet !min-h-9 !px-3 !text-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Main" className={`mx-auto ${width} overflow-x-auto px-2 sm:px-4`}>
          <ul className="flex gap-1 whitespace-nowrap text-sm">
            {[
              ...NAV[user.role],
              ...(user.role === "OBSERVER" && user.teacherId ? [{ key: "my" as NavKey, label: "My own observations", href: "/my" }] : []),
            ].map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active === item.key ? "page" : undefined}
                  className={`block border-b-2 px-3 py-2.5 ${
                    active === item.key ? "border-navy font-semibold text-navy" : "border-transparent text-ink-soft hover:text-navy"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className={`mx-auto ${width} px-4 pb-16 pt-6 sm:px-6 sm:pt-8`}>
        {children}
      </main>
      <WelcomeStory role={user.role} name={user.name} demo={mode === "demo"} autoStart={!user.toursCompleted.includes("welcome")} />
    </>
  );
}

function DemoBanner({ user }: { user: CurrentUser }) {
  return (
    <div className="border-b border-dashed border-navy bg-navy-wash text-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <span className="font-cond font-semibold uppercase tracking-wider text-navy">Demo</span>
        <span className="text-ink">Sample ratings using real staff names. Not real judgements.</span>
        <span className="text-ink-soft">
          Viewing as {user.name} ({ROLE_LABEL[user.role]})
        </span>
        <span className="ml-auto flex gap-3">
          <Link href="/login" className="font-medium text-navy underline underline-offset-2">
            Switch role
          </Link>
          {user.role === "ADMIN" ? (
            <Link href="/admin/go-live" className="font-semibold text-navy underline underline-offset-2">
              Go live
            </Link>
          ) : null}
        </span>
      </div>
    </div>
  );
}

export function PageHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b-2 border-navy pb-4">
      <div className="min-w-0">
        {eyebrow ? <p className="label-caps">{eyebrow}</p> : null}
        <h1 className="mt-1 font-cond text-3xl font-semibold text-navy sm:text-4xl">{title}</h1>
      </div>
      {children ? <div className="ml-auto flex flex-wrap items-center gap-1">{children}</div> : null}
    </div>
  );
}
