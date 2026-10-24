import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type Role = "ADMIN" | "OBSERVER" | "TEACHER";

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
  toursCompleted: string[];
}

/** Loads the signed-in user from the database on every request, so role and password state are never stale. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    toursCompleted: user.toursCompleted,
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

export function homePathFor(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "OBSERVER") return "/visits";
  return "/my";
}
