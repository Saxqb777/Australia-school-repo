import assert from "node:assert/strict";
import { test } from "node:test";
import { criterionDeltas, latestPerTeacher, peerPairs, workshopEffect, workshopPlan, type AreaLike, type FactLike } from "./analytics";
import { feedbackProblems, hasPunctuationDash, wordCount } from "./feedback-checks";
import type { Level } from "./judgement";

const areas: AreaLike[] = [
  { id: 1, name: "Teaching", judgementLabel: "Teaching", criteria: [{ id: 101, code: "1.1", name: "A" }, { id: 102, code: "1.2", name: "B" }] },
  { id: 2, name: "Assessment", judgementLabel: "Assessment", criteria: [{ id: 201, code: "2.1", name: "C" }] },
];

function fact(id: string, teacher: string, date: string, a1: Level, a2: Level, band: FactLike["gradeBand"] = "KG"): FactLike {
  return {
    observationId: `${id}-${date}`,
    cycleStart: date,
    date,
    teacherId: id,
    teacherName: teacher,
    gradeBand: band,
    ratings: new Map<number, Level>([
      [101, a1],
      [102, a1],
      [201, a2],
    ]),
    areaLevels: new Map<number, Level>([
      [1, a1],
      [2, a2],
    ]),
    overall: a1,
  };
}

test("latestPerTeacher keeps the newest observation", () => {
  const latest = latestPerTeacher([fact("t1", "Ms. A", "2026-09-01", 5, 3), fact("t1", "Ms. A", "2026-11-02", 3, 3)]);
  assert.equal(latest.length, 1);
  assert.equal(latest[0]?.areaLevels.get(1), 3);
});

test("workshop plan targets weak areas with flagged teachers, led by experts", () => {
  const latest = [fact("t1", "Ms. A", "2026-11-02", 5, 2), fact("t2", "Ms. B", "2026-11-02", 1, 2), fact("t3", "Ms. C", "2026-11-02", 4, 3)];
  const plan = workshopPlan(latest, areas);
  assert.equal(plan.length, 1);
  assert.equal(plan[0]?.areaId, 1);
  assert.deepEqual(plan[0]?.attendees.map((t) => t.teacherName), ["Ms. A", "Ms. C"]);
  assert.deepEqual(plan[0]?.leads.map((t) => t.teacherName), ["Ms. B"]);
});

test("peer pairs prefer the same grade band and cap load", () => {
  const latest = [
    fact("t1", "Ms. A", "2026-11-02", 5, 3, "KG"),
    fact("t2", "Ms. B", "2026-11-02", 2, 3, "UPPER_PRIMARY"),
    fact("t3", "Ms. C", "2026-11-02", 2, 3, "KG"),
  ];
  const pairs = peerPairs(latest, areas);
  assert.equal(pairs[0]?.partner.teacherName, "Ms. C");
});

test("deltas and workshop effect read lower levels as better", () => {
  const before = fact("t1", "Ms. A", "2026-09-01", 5, 3);
  const after = fact("t1", "Ms. A", "2026-11-02", 3, 3);
  assert.equal(criterionDeltas(before, after, [101])[0]?.change, 2);
  assert.deepEqual(workshopEffect([before, after], 1, "2026-10-10"), { before: 5, after: 3, change: 2 });
});

test("feedback checks follow the school's rules", () => {
  assert.equal(hasPunctuationDash("problem-solving is fine"), false);
  assert.equal(hasPunctuationDash("great lesson — well done"), true);
  assert.equal(hasPunctuationDash("great lesson - well done"), true);
  const letter = `Dear Ms. A,\n\n${"word ".repeat(170).trim()}\n\nKind regards,\nMs. Ayan`;
  assert.ok(wordCount(letter) >= 150);
  assert.deepEqual(feedbackProblems({ strengths: ["a", "b", "c"], improvements: ["x", "y"], letter }, "Ms. A", "Ms. Ayan"), []);
  assert.equal(feedbackProblems({ strengths: ["a"], improvements: ["x", "y"], letter }, "Ms. A", "Ms. Ayan").length, 1);
});
