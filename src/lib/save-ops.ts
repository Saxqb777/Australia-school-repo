/** Changes the observation form sends to the server. Each carries the time it was made on the device (ms). */

export const HEADER_FIELDS = [
  "observedDate",
  "time",
  "lengthOfObservation",
  "title",
  "subject",
  "topic",
  "numberOnRoll",
  "numberPresent",
] as const;

export type HeaderField = (typeof HEADER_FIELDS)[number];

export type HeaderValues = Record<HeaderField, string>;

export type SaveOp =
  | { kind: "header"; field: HeaderField; value: string; ts: number }
  | { kind: "rating"; criterionId: number; level: number | null; ts: number }
  | { kind: "comment"; criterionId: number; comment: string; ts: number }
  | { kind: "area"; areaId: number; level: number | null; reason: string; ts: number }
  | { kind: "overall"; level: number | null; reason: string; ts: number };

/** One pending op per target: a newer change to the same target replaces the older one. */
export function opKey(op: SaveOp): string {
  switch (op.kind) {
    case "header":
      return `header:${op.field}`;
    case "rating":
      return `rating:${op.criterionId}`;
    case "comment":
      return `comment:${op.criterionId}`;
    case "area":
      return `area:${op.areaId}`;
    case "overall":
      return "overall";
  }
}

export interface SaveResponse {
  ok: true;
  savedAt: string;
  status: "draft" | "complete";
}

export interface SaveError {
  ok: false;
  code: "unauthorised" | "forbidden" | "not_found" | "complete" | "invalid";
  message: string;
}
