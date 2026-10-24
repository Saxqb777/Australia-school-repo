import { RATING_LEVELS } from "@/db/seed-data/rubric";

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export function isLevel(value: unknown): value is Level {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 6;
}

export function levelLabel(level: Level): string {
  return RATING_LEVELS[level - 1]?.label ?? "";
}

export function levelShort(level: Level): string {
  return RATING_LEVELS[level - 1]?.short ?? "";
}

/**
 * Rounds a mean of levels (1 = Outstanding ... 6 = Very Weak) to a whole level.
 * An exact .5 rounds towards the weaker level (the higher number), as agreed with the school.
 */
export function roundLevel(mean: number): Level {
  const rounded = Math.floor(mean + 0.5 + 1e-9);
  const clamped = Math.min(6, Math.max(1, rounded));
  return clamped as Level;
}

export function meanLevel(levels: readonly Level[]): { mean: number; level: Level } | null {
  if (levels.length === 0) return null;
  const mean = levels.reduce<number>((sum, l) => sum + l, 0) / levels.length;
  return { mean, level: roundLevel(mean) };
}

export interface AreaInput {
  areaId: number;
  criterionIds: readonly number[];
  override: { level: Level; reason: string } | null;
}

export interface AreaJudgement {
  areaId: number;
  rated: number;
  total: number;
  mean: number | null;
  computed: Level | null;
  effective: Level | null;
  overridden: boolean;
}

export interface LessonJudgement {
  areas: AreaJudgement[];
  overallMean: number | null;
  overallComputed: Level | null;
  overallEffective: Level | null;
  overallOverridden: boolean;
}

/**
 * Area judgement = mean of its rated criteria, rounded. Overall = mean of the areas' effective levels
 * (after any area override), rounded. Overrides replace the computed value but never hide it.
 */
export function computeJudgement(
  areas: readonly AreaInput[],
  ratings: ReadonlyMap<number, Level>,
  overallOverride: { level: Level; reason: string } | null,
): LessonJudgement {
  const areaResults: AreaJudgement[] = areas.map((area) => {
    const levels = area.criterionIds.map((id) => ratings.get(id)).filter(isLevel);
    const m = meanLevel(levels);
    const computed = m?.level ?? null;
    return {
      areaId: area.areaId,
      rated: levels.length,
      total: area.criterionIds.length,
      mean: m?.mean ?? null,
      computed,
      effective: area.override?.level ?? computed,
      overridden: area.override !== null,
    };
  });
  const effectiveLevels = areaResults.map((a) => a.effective).filter(isLevel);
  const overall = meanLevel(effectiveLevels);
  return {
    areas: areaResults,
    overallMean: overall?.mean ?? null,
    overallComputed: overall?.level ?? null,
    overallEffective: overallOverride?.level ?? overall?.level ?? null,
    overallOverridden: overallOverride !== null,
  };
}
