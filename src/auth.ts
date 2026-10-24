import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { users } from "./db/schema";

const credentialsSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(200),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(raw) {
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
        return { id: user.id, name: user.name };
      },
    }),
  ],
});
