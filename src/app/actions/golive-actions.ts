"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { goLive, seedDemoData } from "@/lib/demo-seed";
import { saveDigest } from "@/lib/digest";
import { getMode } from "@/lib/mode";
import { getCurrentUser } from "@/lib/session";

export interface GoLiveState {
  error: string | null;
}

/** Deletes all demo data and opens the real system. Admin only, typed confirmation required. */
export async function goLiveAction(_prev: GoLiveState, formData: FormData): Promise<GoLiveState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "Only the administrator can go live." };
  if ((await getMode()) !== "demo") return { error: "The system is already live." };
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "GO LIVE") {
    return { error: "Type GO LIVE in capitals to confirm." };
  }
  await goLive();
  await signOut({ redirectTo: "/login?live=1" });
  return { error: null };
}

/** Rebuilds the demo from scratch, for the next presentation. Only before Go live. */
export async function resetDemoAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" || (await getMode()) !== "demo") return;
  await seedDemoData();
  await saveDigest(true, "2026-11-02");
  redirect("/admin");
}
