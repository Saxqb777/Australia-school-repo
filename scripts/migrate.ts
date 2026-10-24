import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main(): Promise<void> {
  // On Vercel, only production builds migrate the production database.
  if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
    console.log(`Skipping migrations for VERCEL_ENV=${process.env.VERCEL_ENV ?? "unknown"}`);
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
  console.log("Migrations applied");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
