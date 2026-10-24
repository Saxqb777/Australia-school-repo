export type GradeBand = "KG" | "LOWER_PRIMARY" | "UPPER_PRIMARY";

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  KG: "KG",
  LOWER_PRIMARY: "Lower Primary",
  UPPER_PRIMARY: "Upper Primary",
};

/** "Ms. Asmaa Aly" -> "asmaa.aly" */
export function usernameForName(name: string): string {
  return name
    .replace(/^(Ms|Mrs|Mr|Dr)\.?\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

/** KG classes are KG; Grades 1–2 Lower Primary; Grades 3–5 Upper Primary. */
export function gradeBandForClass(className: string): GradeBand | null {
  const upper = className.trim().toUpperCase();
  if (upper.startsWith("KG")) return "KG";
  const grade = Number.parseInt(upper, 10);
  if (Number.isNaN(grade)) return null;
  return grade <= 2 ? "LOWER_PRIMARY" : "UPPER_PRIMARY";
}
