import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { feedbackProblems, type FeedbackDraft } from "../feedback-checks";
import { levelLabel, type Level } from "../judgement";
import type { RubricArea } from "../queries";

export const SUMMARY_MODEL = "claude-sonnet-5-5";

const DraftSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  letter: z.string(),
});

const SYSTEM = `You write lesson observation feedback for the Australian School of Abu Dhabi, an IB PYP school.
An observer has rated a lesson on the school's official Teacher Observation Form. You receive the ratings, the
form's exact descriptor for each chosen level, and the observer's own comments.

Write three things:
1. "strengths": 3 to 5 short lines for the form's "Areas of Strength" box. Each line names a specific strength.
2. "improvements": 2 to 4 short, actionable lines for "Suggested Areas for Improvement". Each line says what to do next.
3. "letter": a feedback message to the teacher of 150 to 220 words. It opens exactly "Dear <teacher>," and closes
   with "Kind regards," on its own line followed by the observer's name on the next line. Warm, professional,
   encouraging, British English spelling.

Rules:
- Use only the evidence given: the ratings, the descriptors and the comments. Never invent events, students,
  activities, resources or numbers that are not in the evidence.
- Base strengths on the highest rated criteria and improvements on the lowest rated ones.
- You may quote or paraphrase descriptor wording, and refer to criteria by name.
- Do not use dashes as punctuation anywhere (no em dashes, en dashes or spaced hyphens). Use commas and full stops.
- No headings, bullets or emoji inside the lines or the letter.`;

export interface SummaryInput {
  teacherName: string;
  observerName: string;
  className: string;
  subject: string;
  topic: string;
  rubric: RubricArea[];
  ratings: Record<number, { level: Level | null; comment: string }>;
  areaLevels: Map<number, Level | null>;
  overall: Level | null;
}

function evidence(input: SummaryInput): string {
  const lines: string[] = [
    `Teacher: ${input.teacherName}`,
    `Observer: ${input.observerName}`,
    `Class: ${input.className}. Subject: ${input.subject}.${input.topic ? ` Topic: ${input.topic}.` : ""}`,
    `Overall lesson judgement: ${input.overall ? levelLabel(input.overall) : "not given"}`,
    "",
  ];
  for (const area of input.rubric) {
    const al = input.areaLevels.get(area.id) ?? null;
    lines.push(`Area ${area.position}: ${area.name} (area judgement: ${al ? levelLabel(al) : "not rated"})`);
    for (const c of area.criteria) {
      const r = input.ratings[c.id];
      if (!r?.level) {
        lines.push(`- ${c.code} ${c.name}: not rated`);
        continue;
      }
      lines.push(`- ${c.code} ${c.name}: ${levelLabel(r.level)}. Descriptor: "${c.descriptors[r.level]}"`);
      if (r.comment.trim()) lines.push(`  Observer comment: "${r.comment.trim()}"`);
    }
  }
  return lines.join("\n");
}

export class SummaryUnavailableError extends Error {}

export interface SummaryResult {
  draft: FeedbackDraft;
  problems: string[];
}

/** Asks Claude for the strengths, improvements and letter, checks them, and retries once if a rule is broken. */
export async function writeSummary(input: SummaryInput): Promise<SummaryResult> {
  if (!process.env.ANTHROPIC_API_KEY) throw new SummaryUnavailableError("AI writing is not switched on.");
  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: evidence(input) }];
  let draft: FeedbackDraft | null = null;
  let problems: string[] = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await client.beta.messages.parse({
      model: SUMMARY_MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(DraftSchema) },
      system: SYSTEM,
      messages,
    });
    if (response.stop_reason === "refusal") throw new SummaryUnavailableError("The AI declined to write this summary.");
    const parsed = response.parsed_output;
    if (!parsed) throw new SummaryUnavailableError("The AI reply could not be read.");
    draft = {
      strengths: parsed.strengths.map((s) => s.trim()).filter(Boolean),
      improvements: parsed.improvements.map((s) => s.trim()).filter(Boolean),
      letter: parsed.letter.trim(),
    };
    problems = feedbackProblems(draft, input.teacherName, input.observerName);
    if (problems.length === 0) break;
    messages.push(
      { role: "assistant", content: JSON.stringify(parsed) },
      { role: "user", content: `Please correct these points and return the full result again:\n${problems.join("\n")}` },
    );
  }
  if (!draft) throw new SummaryUnavailableError("The AI reply could not be read.");
  return { draft, problems };
}

const TranslationSchema = z.object({ strengths: z.string(), improvements: z.string(), feedback: z.string() });

/** Translates the teacher-facing feedback into Arabic. The rubric wording itself is never translated. */
export async function translateToArabic(text: { strengths: string; improvements: string; feedback: string }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new SummaryUnavailableError("AI translation is not switched on.");
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: SUMMARY_MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(TranslationSchema) },
    system:
      "Translate school feedback for a teacher from English into Modern Standard Arabic. Keep the meaning, warmth and line breaks exactly. Keep names of people as they are. Do not add or remove content.",
    messages: [{ role: "user", content: JSON.stringify(text) }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new SummaryUnavailableError("The translation could not be made.");
  }
  return response.parsed_output;
}
