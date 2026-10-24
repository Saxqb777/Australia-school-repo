import { redirect } from "next/navigation";
import { requireUser, homePathFor } from "@/lib/session";

export default async function Home() {
  const user = await requireUser();
  redirect(homePathFor(user.role));
}
