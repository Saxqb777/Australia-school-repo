import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { appSettings, users } from "./db/schema";

const credentialsSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(200),
  password: z.string().min(1).max(200),
});

async function currentMode(): Promise<"demo" | "live"> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, "mode") });
  return row?.value === "live" ? "live" : "demo";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      credentials: { username: {}, password: {} },
      async authorize(raw) {
        // Real sign-in opens only after Go live.
        if ((await currentMode()) !== "live") return null;
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await db.query.users.findFirst({ where: eq(users.username, parsed.data.username) });
        if (!user) {
          // Spend similar time on unknown usernames so they can't be told apart by timing.
          await bcrypt.compare(parsed.data.password, "$2b$10$IxKhRGnfSHzLY/OVKd2NK.qtIYPeTZ1we5ZnFUFLovJx7C6G7dERe");
          return null;
        }
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, demo: false };
      },
    }),
    Credentials({
      id: "demo",
      credentials: { userId: {} },
      async authorize(raw) {
        // One-click demo sign-in, available only before Go live.
        if ((await currentMode()) !== "demo") return null;
        const parsed = z.object({ userId: z.uuid() }).safeParse(raw);
        if (!parsed.success) return null;
        const user = await db.query.users.findFirst({ where: eq(users.id, parsed.data.userId) });
        if (!user) return null;
        return { id: user.id, name: user.name, demo: true };
      },
    }),
  ],
});
