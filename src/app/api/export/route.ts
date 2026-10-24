import { buildExport, toCsv, toXlsx } from "@/lib/export";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return new Response("Sign in to export your data.", { status: 401 });
  if (user.role === "TEACHER") {
    return new Response("Export of your own observations arrives with the teacher portal.", { status: 403 });
  }
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const sheets = await buildExport(user);
  const who = user.role === "ADMIN" ? "all" : user.username.replace(/[^a-z0-9.]/gi, "");
  const base = `asad-observations-${who}-${stamp()}`;
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

  if (format === "csv") {
    const ratings = sheets.find((s) => s.name === "Ratings");
    if (!ratings) return new Response("Nothing to export.", { status: 404 });
    return new Response(toCsv(ratings), {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}-ratings.csv"`,
      },
    });
  }
  const body = await toXlsx(sheets, "ASAD teacher observations");
  return new Response(new Uint8Array(body), {
    headers: {
      ...headers,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
    },
  });
}
