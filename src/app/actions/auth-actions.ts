"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isDemoMode } from "@/lib/mode";
import { getCurrentUser, homePathFor } from "@/lib/session";

export interface FormState {
  error: string | null;
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      if (await isDemoMode()) return { error: "Sign-in with passwords opens when the administrator presses Go live." };
      return { error: "That username and password don't match. Check both and try again." };
    }
    throw error;
  }
}

/** One-click sign-in as any person, only while the system is in demo mode. */
export async function demoSignInAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "");
  const target = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
  if (!target) redirect("/login");
  await signIn("demo", { userId, redirectTo: homePathFor(target.role) });
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(10, "Use at least 10 characters for the new password.").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The two new passwords don't match.", path: ["confirm"] })
  .refine((v) => v.next !== v.current, {
    message: "Choose a new password that is different from the current one.",
    path: ["next"],
  });

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.demo) return { error: "Passwords can't be changed in the demo. Each person sets their own after Go live." };
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the passwords and try again." };

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!row || !(await bcrypt.compare(parsed.data.current, row.passwordHash))) {
    return { error: "Your current password is not correct." };
  }
  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(parsed.data.next, 10),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  redirect(homePathFor(user.role));
}
