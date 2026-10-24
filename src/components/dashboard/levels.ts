import type { Level } from "@/lib/judgement";

/** Sequential navy scale: darkest is Outstanding. Text colour chosen per step for AA contrast. */
export const LEVEL_FILL: Record<Level, { bg: string; fg: string }> = {
  1: { bg: "#0A3655", fg: "#FFFFFF" },
  2: { bg: "#2C5A84", fg: "#FFFFFF" },
  3: { bg: "#4F78A0", fg: "#FFFFFF" },
  4: { bg: "#A9C1D7", fg: "#121A22" },
  5: { bg: "#D5E1EC", fg: "#121A22" },
  6: { bg: "#EEF2F6", fg: "#121A22" },
};
