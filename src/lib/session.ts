import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { teachers, users } from "@/db/schema";
import { getMode } from "./mode";

export type Role = "ADMIN" | "OBSERVER" | "TEACHER";

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
  toursCompleted: string[];
  /** Signed in through the one-click demo before Go live. */
  demo: boolean;
  /** The teacher record linked to this login, if any. */
  teacherId: string | null;
}

/**
 * Loads the signed-in user from the database on every request, so role and password state are never stale.
 * Demo sessions only count before Go live, and password sessions only after it.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const demo = session.user.demo === true;
  const mode = await getMode();
  if (demo !== (mode === "demo")) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return null;
  const teacher = await db.query.teachers.findFirst({ where: eq(teachers.userId, user.id), columns: { id: true } });
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    mustChangePassword: demo ? false : user.mustChangePassword,
    toursCompleted: user.toursCompleted,
    demo,
    teacherId: teacher?.id ?? null,
  };
});

/** For pages: signed in, password already changed, and (optionally) one of the given roles. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

/** Ms. Ayan and Ms. Marwa (observers) run the system day to day; the admin login has the same powers plus Go live. */
export function canManage(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "ADMIN" || user.role === "OBSERVER";
}

export function homePathFor(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "OBSERVER") return "/visits";
  return "/my";
}

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrator", OBSERVER: "Observer", TEACHER: "Teacher" };
