import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSchedule, resolveDate } from "./schedule-import";

test("weekday names resolve within the cycle week", () => {
  assert.equal(resolveDate("Monday", "2026-11-02"), "2026-11-02");
  assert.equal(resolveDate("Thursday", "2026-11-02"), "2026-11-05");
  assert.equal(resolveDate("05/11/2026", "2026-11-02"), "2026-11-05");
});

test("pasted table with merged observer cells", () => {
  const text = [
    "Observer\tTeacher\tClass\tSubject\tDate\tPeriod",
    "Ms. Ayan\tMs. Cornelia\tKG2A\tEnglish\tMonday\t3",
    "\tMs. Rana\t1A\tEnglish\tMonday\t6",
    "Ms. Marwa\tMaha\t4B\tPSPE\tMonday\t3",
  ].join("\n");
  const r = parseSchedule(text, "2026-11-02");
  assert.equal(r.errors.length, 0);
  assert.equal(r.rows.length, 3);
  assert.equal(r.rows[1]?.observer, "Ms. Ayan");
  assert.equal(r.rows[2]?.teacher, "Ms. Maha");
});

test("CSV with quotes and a bad row", () => {
  const text = 'Observer,Teacher,Class,Subject,Day,Period\n"Ms. Ayan","Ms. Oras",4B,Math,Friday,2\nMs. Ayan,Ms. X,4B,Math,Someday,2';
  const r = parseSchedule(text, "2026-11-02");
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0]?.date, "2026-11-06");
  assert.equal(r.errors.length, 1);
});
