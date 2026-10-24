"use server";

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const WORDS = ["amber", "cedar", "comet", "coral", "delta", "falcon", "harbor", "lagoon", "maple", "meadow", "olive", "quartz", "raven", "summit", "tulip", "willow"];

export interface ResetState {
  userId: string | null;
  name: string | null;
  username: string | null;
  password: string | null;
  error: string | null;
}

/** Admin only: issues a new temporary password, shown once, and makes the user choose their own at next sign in. */
export async function resetPasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.mustChangePassword) {
    return { userId: null, name: null, username: null, password: null, error: "Only the administrator can reset passwords." };
  }
  const parsed = z.uuid().safeParse(formData.get("userId"));
  if (!parsed.success) return { userId: null, name: null, username: null, password: null, error: "Unknown user." };
  const target = await db.query.users.findFirst({ where: eq(users.id, parsed.data) });
  if (!target) return { userId: null, name: null, username: null, password: null, error: "Unknown user." };
  const pick = () => WORDS[randomInt(WORDS.length)] ?? "school";
  const password = `${pick()}-${randomInt(1000, 10000)}-${pick()}`;
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true, updatedAt: new Date() })
    .where(eq(users.id, target.id));
  revalidatePath("/admin");
  return { userId: target.id, name: target.name, username: target.username, password, error: null };
}
