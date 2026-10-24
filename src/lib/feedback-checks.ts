/** Checks the school's rules for the feedback message. Pure, so it can be tested and shown in the form. */

export interface FeedbackDraft {
  strengths: string[];
  improvements: string[];
  letter: string;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Em dash, en dash, or a hyphen used as punctuation between spaces. Hyphenated words are fine. */
export function hasPunctuationDash(text: string): boolean {
  return /[–—‒―]/.test(text) || /\s-\s/.test(text);
}

export function feedbackProblems(draft: FeedbackDraft, teacherName: string, observerName: string): string[] {
  const problems: string[] = [];
  if (draft.strengths.length < 3 || draft.strengths.length > 5) {
    problems.push(`Areas of Strength needs 3 to 5 lines; it has ${draft.strengths.length}.`);
  }
  if (draft.improvements.length < 2 || draft.improvements.length > 4) {
    problems.push(`Suggested Areas for Improvement needs 2 to 4 lines; it has ${draft.improvements.length}.`);
  }
  const words = wordCount(draft.letter);
  if (words < 150 || words > 220) problems.push(`The message must be 150 to 220 words; it is ${words}.`);
  if (!draft.letter.trim().startsWith(`Dear ${teacherName}`)) problems.push(`The message must open "Dear ${teacherName},".`);
  const ending = draft.letter.trim().replace(/\s+/g, " ");
  if (!ending.endsWith(`Kind regards, ${observerName}`)) {
    problems.push(`The message must close "Kind regards," then "${observerName}" on the next line.`);
  }
  const all = [...draft.strengths, ...draft.improvements, draft.letter].join("\n");
  if (hasPunctuationDash(all)) problems.push("Do not use dashes as punctuation; use commas or full stops.");
  return problems;
}

export function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[\s•*·]+/, "").trim())
    .filter(Boolean);
}
