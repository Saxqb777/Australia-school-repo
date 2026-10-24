import type { HeaderField, HeaderValues } from "./save-ops";

export const REQUIRED_HEADER_FIELDS: { field: HeaderField; label: string }[] = [
  { field: "observedDate", label: "Date of Observation" },
  { field: "time", label: "Time" },
  { field: "lengthOfObservation", label: "Length of Observation" },
  { field: "subject", label: "Subject" },
  { field: "topic", label: "Topic" },
  { field: "numberOnRoll", label: "Number on roll" },
  { field: "numberPresent", label: "Number present" },
];

export interface CompletenessInput {
  header: HeaderValues;
  criteria: { id: number; code: string; name: string }[];
  ratedCriterionIds: ReadonlySet<number>;
  areaOverrides: { areaName: string; level: number | null; reason: string }[];
  overallOverride: { level: number | null; reason: string };
}

export interface CompletenessIssue {
  kind: "header" | "rating" | "reason";
  label: string;
  anchor: string;
}

/** Everything that must be filled in before an observation can be marked complete. */
export function completenessIssues(input: CompletenessInput): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  for (const { field, label } of REQUIRED_HEADER_FIELDS) {
    if (input.header[field].trim() === "") issues.push({ kind: "header", label, anchor: `field-${field}` });
  }
  const roll = Number(input.header.numberOnRoll);
  const present = Number(input.header.numberPresent);
  if (input.header.numberOnRoll !== "" && input.header.numberPresent !== "" && present > roll) {
    issues.push({ kind: "header", label: "Number present is more than number on roll", anchor: "field-numberPresent" });
  }
  for (const c of input.criteria) {
    if (!input.ratedCriterionIds.has(c.id)) {
      issues.push({ kind: "rating", label: `${c.code} ${c.name}`, anchor: `criterion-${c.id}` });
    }
  }
  for (const a of input.areaOverrides) {
    if (a.level !== null && a.reason.trim() === "") {
      issues.push({ kind: "reason", label: `Reason for changing ${a.areaName}`, anchor: "judgement" });
    }
  }
  if (input.overallOverride.level !== null && input.overallOverride.reason.trim() === "") {
    issues.push({ kind: "reason", label: "Reason for changing the Overall Lesson Judgement", anchor: "judgement" });
  }
  return issues;
}
