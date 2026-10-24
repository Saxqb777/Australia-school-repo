import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

export type AppMode = "demo" | "live";

/** Demo until an administrator presses Go live. Read once per request. */
export const getMode = cache(async (): Promise<AppMode> => {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, "mode") });
  return row?.value === "live" ? "live" : "demo";
});

export async function isDemoMode(): Promise<boolean> {
  return (await getMode()) === "demo";
}
