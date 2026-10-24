import assert from "node:assert/strict";
import { test } from "node:test";
import { computeJudgement, roundLevel, type Level } from "./judgement";
import { suggestLevel, termForPercent, wholePercent } from "./percentage";

test("roundLevel rounds .5 towards the weaker level", () => {
  assert.equal(roundLevel(2.5), 3);
  assert.equal(roundLevel(2.49), 2);
  assert.equal(roundLevel(3.5), 4);
  assert.equal(roundLevel(1), 1);
  assert.equal(roundLevel(6), 6);
});

test("computeJudgement: area mean, override, overall from effective areas", () => {
  const ratings = new Map<number, Level>([
    [101, 2],
    [102, 3],
    [201, 4],
  ]);
  const result = computeJudgement(
    [
      { areaId: 1, criterionIds: [101, 102], override: null },
      { areaId: 2, criterionIds: [201, 202], override: { level: 3, reason: "Strong evidence in group work" } },
      { areaId: 3, criterionIds: [301], override: null },
    ],
    ratings,
    null,
  );
  assert.equal(result.areas[0]?.computed, 3); // 2.5 -> 3
  assert.equal(result.areas[1]?.computed, 4);
  assert.equal(result.areas[1]?.effective, 3);
  assert.equal(result.areas[2]?.computed, null);
  assert.equal(result.overallComputed, 3); // mean(3, 3)
  assert.equal(result.overallEffective, 3);
});

test("overall override wins but computed is kept", () => {
  const result = computeJudgement(
    [{ areaId: 1, criterionIds: [101], override: null }],
    new Map<number, Level>([[101, 5]]),
    { level: 4, reason: "Reason" },
  );
  assert.equal(result.overallComputed, 5);
  assert.equal(result.overallEffective, 4);
  assert.equal(result.overallOverridden, true);
});

test("percentage key terms match the form", () => {
  assert.equal(termForPercent(95)?.term, "Almost all");
  assert.equal(termForPercent(90)?.term, "Most");
  assert.equal(termForPercent(75)?.term, "Most");
  assert.equal(termForPercent(74)?.term, "Large majority");
  assert.equal(termForPercent(50)?.term, "Majority");
  assert.equal(termForPercent(31)?.term, "Large minority");
  assert.equal(termForPercent(16)?.term, "Minority");
  assert.equal(termForPercent(15)?.term, "Few");
  assert.equal(wholePercent(3, 0), null);
});

test("suggestLevel reads counts against the descriptors", () => {
  assert.equal(suggestLevel(20, 16, 20)?.level, 1);
  assert.equal(suggestLevel(20, 13, 20)?.level, 2);
  assert.equal(suggestLevel(20, 10, 20)?.level, 3);
  assert.equal(suggestLevel(20, 4, 16)?.level, 4);
  assert.equal(suggestLevel(20, 2, 10)?.level, 5);
  assert.equal(suggestLevel(20, 0, 3)?.level, 6);
  assert.equal(suggestLevel(20, 12, 10), null);
});
