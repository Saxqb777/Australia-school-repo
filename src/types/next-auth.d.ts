import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; demo: boolean } & DefaultSession["user"];
  }
  interface User {
    demo?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    demo?: boolean;
  }
}
