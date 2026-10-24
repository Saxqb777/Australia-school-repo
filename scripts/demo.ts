// Rebuilds the demo data. Run with: npm run db:demo (uses the react-server condition for server-only modules).
import { saveDigest } from "../src/lib/digest";
import { seedDemoData } from "../src/lib/demo-seed";

async function main(): Promise<void> {
  const summary = await seedDemoData();
  await saveDigest(true, "2026-11-02");
  console.log("Demo ready", summary);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
