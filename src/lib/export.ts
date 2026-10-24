import "server-only";
import { asc } from "drizzle-orm";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { teachers, users } from "@/db/schema";
import { GRADE_BAND_LABELS } from "./names";
import { isLevel, levelLabel } from "./judgement";
import { getObservationState, getRubric, judgementFor, listVisits, type VisitListItem } from "./queries";
import type { CurrentUser } from "./session";

type Cell = string | number | null;

export interface Sheet {
  name: string;
  columns: { header: string; width: number; wrap?: boolean }[];
  rows: Cell[][];
}

const STATUS_LABEL: Record<VisitListItem["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

/** Builds the export for one user. Observers get only their own visits; admin gets everything. Never passwords. */
export async function buildExport(user: CurrentUser, demo: boolean): Promise<Sheet[]> {
  const isAdmin = user.role === "ADMIN";
  const [visitList, rubric] = await Promise.all([
    listVisits(isAdmin ? { demo } : { demo, observerUserId: user.id }),
    getRubric(),
  ]);
  const criteria = rubric.flatMap((a) => a.criteria.map((c) => ({ ...c, areaName: a.name })));

  const visitRows: Cell[][] = [];
  const ratingRows: Cell[][] = [];
  const judgementRows: Cell[][] = [];

  for (const v of visitList) {
    visitRows.push([v.cycleLabel, v.date, v.period, v.observerName, v.teacherName, v.className, v.subject, STATUS_LABEL[v.status], v.ratedCount]);
    if (v.status === "not_started") continue;
    const state = await getObservationState(v);
    const j = judgementFor(rubric, state);
    for (const c of criteria) {
      const r = state.ratings[c.id];
      const level = r?.level ?? null;
      ratingRows.push([
        state.header.observedDate || v.date,
        v.period,
        v.observerName,
        v.teacherName,
        v.className,
        state.header.subject || v.subject,
        c.areaName,
        c.code,
        c.name,
        level,
        level ? levelLabel(level) : null,
        level ? c.descriptors[level] : null,
        r?.comment || null,
      ]);
    }
    judgementRows.push([
      state.header.observedDate || v.date,
      v.observerName,
      v.teacherName,
      v.className,
      state.header.subject || v.subject,
      state.header.topic || null,
      state.header.time || null,
      state.header.lengthOfObservation || null,
      state.header.numberOnRoll || null,
      state.header.numberPresent || null,
      ...rubric.map((a, i) => {
        const eff = j.areas[i]?.effective ?? null;
        return eff ? levelLabel(eff) : null;
      }),
      j.overallEffective ? levelLabel(j.overallEffective) : null,
      [
        ...rubric
          .filter((a) => state.areaOverrides[a.id]?.level)
          .map((a) => `${a.judgementLabel}: ${state.areaOverrides[a.id]?.reason ?? ""}`),
        ...(state.overall.level ? [`Overall: ${state.overall.reason}`] : []),
      ].join("\n") || null,
      STATUS_LABEL[v.status],
      state.strengths || null,
      state.improvements || null,
      state.feedback || null,
      state.sharedAt ? "Yes" : "No",
      state.signedByTeacherAt ? state.signedByTeacherAt.slice(0, 10) : null,
      state.reflection?.text ?? null,
    ]);
  }

  const sheets: Sheet[] = [
    {
      name: "Visits",
      columns: [
        { header: "Cycle", width: 18 },
        { header: "Date", width: 12 },
        { header: "Period", width: 8 },
        { header: "Observer", width: 18 },
        { header: "Teacher", width: 22 },
        { header: "Class", width: 8 },
        { header: "Subject", width: 16 },
        { header: "Status", width: 13 },
        { header: "Criteria rated (of 20)", width: 12 },
      ],
      rows: visitRows,
    },
    {
      name: "Ratings",
      columns: [
        { header: "Date", width: 12 },
        { header: "Period", width: 8 },
        { header: "Observer", width: 18 },
        { header: "Teacher", width: 22 },
        { header: "Class", width: 8 },
        { header: "Subject", width: 16 },
        { header: "Area", width: 26 },
        { header: "Code", width: 6 },
        { header: "Criterion", width: 40, wrap: true },
        { header: "Level (1 Outstanding – 6 Very Weak)", width: 10 },
        { header: "Rating", width: 13 },
        { header: "Descriptor", width: 60, wrap: true },
        { header: "Comment", width: 50, wrap: true },
      ],
      rows: ratingRows,
    },
    {
      name: "Judgements",
      columns: [
        { header: "Date", width: 12 },
        { header: "Observer", width: 18 },
        { header: "Teacher", width: 22 },
        { header: "Class", width: 8 },
        { header: "Subject", width: 16 },
        { header: "Topic", width: 24, wrap: true },
        { header: "Time", width: 8 },
        { header: "Length", width: 12 },
        { header: "On roll", width: 8 },
        { header: "Present", width: 8 },
        ...rubric.map((a) => ({ header: a.judgementLabel, width: 16 })),
        { header: "Overall Lesson Judgement", width: 16 },
        { header: "Reasons for changed judgements", width: 40, wrap: true },
        { header: "Status", width: 12 },
        { header: "Areas of Strength", width: 50, wrap: true },
        { header: "Suggested Areas for Improvement", width: 50, wrap: true },
        { header: "Feedback message", width: 70, wrap: true },
        { header: "Shared with teacher", width: 10 },
        { header: "Teacher signed", width: 12 },
        { header: "Teacher reflection", width: 50, wrap: true },
      ],
      rows: judgementRows,
    },
  ];

  if (isAdmin) {
    const [teacherRows, userRows] = await Promise.all([
      db
        .select({ name: teachers.name, subjects: teachers.subjects, gradeBand: teachers.gradeBand, userId: teachers.userId })
        .from(teachers)
        .orderBy(asc(teachers.name)),
      db
        .select({ id: users.id, name: users.name, username: users.username, role: users.role, mustChange: users.mustChangePassword })
        .from(users)
        .orderBy(asc(users.role), asc(users.name)),
    ]);
    const usernames = new Map(userRows.map((u) => [u.id, u.username]));
    sheets.push(
      {
        name: "Teachers",
        columns: [
          { header: "Teacher", width: 22 },
          { header: "Username", width: 18 },
          { header: "Grade band", width: 15 },
          { header: "Subjects", width: 30 },
        ],
        rows: teacherRows.map((t) => [
          t.name,
          t.userId ? (usernames.get(t.userId) ?? null) : null,
          t.gradeBand ? GRADE_BAND_LABELS[t.gradeBand] : null,
          t.subjects.join(", "),
        ]),
      },
      {
        name: "Logins",
        columns: [
          { header: "Name", width: 22 },
          { header: "Username", width: 26 },
          { header: "Role", width: 10 },
          { header: "Password", width: 26 },
        ],
        rows: userRows.map((u) => [u.name, u.username, u.role, u.mustChange ? "Temporary, not yet changed" : "Chosen by user"]),
      },
      {
        name: "Rubric",
        columns: [
          { header: "Area", width: 26 },
          { header: "Code", width: 6 },
          { header: "Criterion", width: 40, wrap: true },
          { header: "Level", width: 13 },
          { header: "Descriptor", width: 70, wrap: true },
        ],
        rows: criteria.flatMap((c) =>
          ([1, 2, 3, 4, 5, 6] as const).filter(isLevel).map((l) => [c.areaName, c.code, c.name, levelLabel(l), c.descriptors[l]]),
        ),
      },
    );
  }
  return sheets;
}

export async function toXlsx(sheets: Sheet[], title: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ASAD Observation Hub";
  wb.title = title;
  wb.created = new Date();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = sheet.columns.map((c) => ({ header: c.header, width: c.width }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A3655" } };
    head.alignment = { vertical: "middle", wrapText: true };
    head.height = 30;
    for (const row of sheet.rows) ws.addRow(row);
    sheet.columns.forEach((c, i) => {
      if (c.wrap) ws.getColumn(i + 1).alignment = { wrapText: true, vertical: "top" };
    });
    if (sheet.rows.length > 0) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
  }
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function csvCell(value: Cell): string {
  if (value === null) return "";
  const s = String(value);
  // Neutralise spreadsheet formulas in free text.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(sheet: Sheet): string {
  const lines = [sheet.columns.map((c) => csvCell(c.header)).join(","), ...sheet.rows.map((r) => r.map(csvCell).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}
