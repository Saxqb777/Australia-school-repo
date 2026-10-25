import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { SummaryUnavailableError, SUMMARY_MODEL } from "./summary";

export const READABLE_TYPES: Record<string, "pdf" | "image"> = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
};

function fileBlock(data: Buffer, mimeType: string): Anthropic.Beta.BetaContentBlockParam {
  const kind = READABLE_TYPES[mimeType];
  if (kind === "pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") } };
  }
  if (kind === "image") {
    return {
      type: "image",
      source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: data.toString("base64") },
    };
  }
  throw new SummaryUnavailableError("This file type can't be read. Use a PDF, or a JPG or PNG photo.");
}

async function parseWith<T extends z.ZodType>(schema: T, system: string, content: Anthropic.Beta.BetaContentBlockParam[]): Promise<z.infer<T>> {
  if (!process.env.ANTHROPIC_API_KEY) throw new SummaryUnavailableError("AI reading is not switched on.");
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: SUMMARY_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new SummaryUnavailableError("The file could not be read. Check it is the right document and try again.");
  }
  return response.parsed_output;
}

const LEVEL_NAMES = ["Outstanding", "Very Good", "Good", "Acceptable", "Weak", "Very Weak"] as const;

const PeerSchema = z.object({
  observerName: z.string(),
  teacherName: z.string(),
  className: z.string(),
  subject: z.string(),
  date: z.string(),
  period: z.string(),
  topic: z.string(),
  ratings: z.array(
    z.object({
      code: z.string(),
      level: z.enum([...LEVEL_NAMES, "Not rated"]),
      sure: z.boolean(),
    }),
  ),
  comments: z.array(z.object({ code: z.string(), text: z.string() })),
  strengths: z.string(),
  improvements: z.string(),
  overall: z.enum([...LEVEL_NAMES, "Not given"]),
  unsure: z.array(z.string()),
});

export type PeerReading = z.infer<typeof PeerSchema>;

/** Reads a completed Teacher Observation Form (typed, scanned or photographed) handed in by a peer observer. */
export async function readPeerForm(
  data: Buffer,
  mimeType: string,
  criteria: { code: string; name: string }[],
): Promise<PeerReading> {
  const list = criteria.map((c) => `${c.code} ${c.name}`).join("\n");
  const system = `You read completed copies of the Australian School of Abu Dhabi's Teacher Observation Form. They may be typed,
or printed and filled in by hand, then scanned or photographed.

The form has header boxes (Teacher Observed, Time, Observer, Date of Observation, Length of Observation, Title,
Subject, Topic, Number on roll/present), then a grid of criteria. Each criterion row has six columns: Outstanding,
Very Good, Good, Acceptable, Weak, Very Weak, then Comments. The observer marks one column per row with a tick,
cross, circle, highlight or shading.

Report exactly what is on the page. Never guess a rating that is not clearly marked: use "Not rated" and add the
criterion to "unsure". Set "sure" to false for any mark that is faint, ambiguous or spans two columns.
Use these criterion codes for the rows, in this order:
${list}

Dates: return YYYY-MM-DD if a full date is visible, otherwise an empty string. Period: digits only or empty.
Copy names as written, keeping titles such as "Ms.". Comments and the Areas of Strength and Suggested Areas for
Improvement boxes: copy the text as written; for handwriting you cannot read, write [unclear].
"unsure" lists short plain notes about anything the coordinator should check against the original.`;
  return parseWith(PeerSchema, system, [fileBlock(data, mimeType), { type: "text", text: "Read this completed form." }]);
}

const ScheduleSchema = z.object({
  rows: z.array(
    z.object({
      observer: z.string(),
      teacher: z.string(),
      className: z.string(),
      subject: z.string(),
      day: z.string(),
      period: z.string(),
    }),
  ),
});

const SCHEDULE_SYSTEM = `You read school visitation schedules: tables listing an observer, the teacher visited, the class, the
subject, the day or date, and the period. Return every visit row in order. When an observer's cell is merged or
blank, repeat the observer from the row above. Keep names exactly as written, joining names that wrap onto a
second line (for example "Ms. Asmaa" and "Shehata" are one name). Day: the weekday name or the date as written.
Period: digits only. Do not invent rows.`;

/** Reads a visitation schedule from a PDF, photo, or Word document's text into rows for the import preview. */
export async function readSchedule(input: { data: Buffer; mimeType: string } | { text: string }): Promise<string> {
  const content: Anthropic.Beta.BetaContentBlockParam[] =
    "text" in input
      ? [{ type: "text", text: `The schedule document's content:\n\n${input.text}` }]
      : [fileBlock(input.data, input.mimeType), { type: "text", text: "Read this visitation schedule." }];
  const out = await parseWith(ScheduleSchema, SCHEDULE_SYSTEM, content);
  const clean = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();
  return [
    "Observer\tTeacher\tClass\tSubject\tDay\tPeriod",
    ...out.rows.map((r) => [r.observer, r.teacher, r.className, r.subject, r.day, r.period].map(clean).join("\t")),
  ].join("\n");
}

export function levelFromName(name: string): number | null {
  const i = LEVEL_NAMES.indexOf(name as (typeof LEVEL_NAMES)[number]);
  return i >= 0 ? i + 1 : null;
}
