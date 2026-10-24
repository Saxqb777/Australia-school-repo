"use client";

import { useActionState } from "react";
import { addPersonAction, createCycleAction, importScheduleAction, type SetupState } from "@/app/actions/setup-actions";
import { dayMonth } from "@/lib/dates";

const empty: SetupState = { ok: false, message: null };

function Message({ state }: { state: SetupState }) {
  if (!state.message) return null;
  return (
    <p role="status" className="mt-3 border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
      {state.message}
    </p>
  );
}

function Logins({ state }: { state: SetupState }) {
  if (!state.logins?.length) return null;
  return (
    <div className="mt-3 overflow-x-auto border border-navy bg-sheet">
      <table className="w-full text-sm">
        <caption className="px-3 py-2 text-left text-xs text-ink-soft">New logins. Copy these now; the passwords are not shown again.</caption>
        <thead>
          <tr className="bg-navy-wash text-left">
            <th className="px-3 py-1.5">Name</th>
            <th className="px-3 py-1.5">Username</th>
            <th className="px-3 py-1.5">Temporary password</th>
          </tr>
        </thead>
        <tbody>
          {state.logins.map((l) => (
            <tr key={l.username} className="border-t border-rule">
              <td className="px-3 py-1.5">{l.name}</td>
              <td className="px-3 py-1.5 font-mono">{l.username}</td>
              <td className="px-3 py-1.5 font-mono select-all">{l.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CycleForm() {
  const [state, action, pending] = useActionState(createCycleAction, empty);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-6">
      <label className="text-xs text-ink-soft sm:col-span-2">
        Academic year
        <input name="academicYear" className="field !py-2" defaultValue="2026–2027" required />
      </label>
      <label className="text-xs text-ink-soft">
        Term
        <input name="term" type="number" min={1} max={4} className="field !py-2" defaultValue={1} required />
      </label>
      <label className="text-xs text-ink-soft">
        Week
        <input name="week" type="number" min={1} max={60} className="field !py-2" required />
      </label>
      <label className="text-xs text-ink-soft">
        Starts
        <input name="startDate" type="date" className="field !py-2" required />
      </label>
      <label className="text-xs text-ink-soft">
        Ends
        <input name="endDate" type="date" className="field !py-2" required />
      </label>
      <div className="sm:col-span-6">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create cycle"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function ScheduleForm({ cycles }: { cycles: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(importScheduleAction, empty);
  return (
    <form action={action} className="space-y-3">
      <label className="block text-xs text-ink-soft">
        Cycle
        <select name="cycleId" className="field !py-2" defaultValue={state.cycleId ?? cycles[0]?.id ?? ""} required>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-ink-soft">
        Paste the table (copy it straight from Word, Excel or the PDF)
        <textarea
          name="text"
          className="field mt-1 min-h-40 font-mono !text-sm"
          defaultValue={state.text ?? ""}
          key={state.text ?? "empty"}
          placeholder={"Observer\tTeacher\tClass\tSubject\tDate\tPeriod\nMs. Ayan\tMs. Cornelia\tKG2A\tEnglish\tMonday\t3"}
        />
      </label>
      <label className="block text-xs text-ink-soft">
        Or choose a CSV file
        <input name="file" type="file" accept=".csv,text/csv,text/plain" className="mt-1 block text-sm" />
      </label>
      <p className="text-xs text-ink-soft">
        Columns: Observer, Teacher, Class, Subject, Date (or Day), Period. A blank observer repeats the one above, as on the
        school&rsquo;s schedule. New teachers get a teacher login automatically.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="step" value="preview" className="btn btn-quiet" disabled={pending}>
          Check the schedule
        </button>
        {state.preview && state.preview.errors.length === 0 && state.preview.rows.length > 0 ? (
          <button type="submit" name="step" value="import" className="btn btn-primary" disabled={pending}>
            {pending ? "Importing…" : `Import ${state.preview.rows.length} visits`}
          </button>
        ) : null}
      </div>
      <Message state={state} />
      {state.preview ? (
        <div className="overflow-x-auto border border-rule bg-sheet">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="bg-navy-wash text-left">
                {["Line", "Observer", "Teacher", "Class", "Subject", "Date", "P"].map((h) => (
                  <th key={h} className="px-3 py-1.5 font-cond">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.preview.errors.map((e) => (
                <tr key={`e${e.line}`} className="border-t border-rule">
                  <td className="px-3 py-1.5 font-mono">{e.line}</td>
                  <td colSpan={6} className="px-3 py-1.5 font-medium text-navy">
                    {e.message}
                  </td>
                </tr>
              ))}
              {state.preview.rows.map((r) => (
                <tr key={r.line} className="border-t border-rule">
                  <td className="px-3 py-1.5 font-mono text-ink-faint">{r.line}</td>
                  <td className="px-3 py-1.5">
                    {r.observer}
                    {!r.observerHasLogin ? <span className="block text-xs text-ink-faint">No observer login</span> : null}
                  </td>
                  <td className="px-3 py-1.5">
                    {r.teacher}
                    {r.teacherIsNew ? <span className="block text-xs text-navy">New: login will be created</span> : null}
                  </td>
                  <td className="px-3 py-1.5">{r.className}</td>
                  <td className="px-3 py-1.5">{r.subject}</td>
                  <td className="px-3 py-1.5">{dayMonth(r.date)}</td>
                  <td className="px-3 py-1.5 font-mono">{r.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Logins state={state} />
    </form>
  );
}

export function PersonForm() {
  const [state, action, pending] = useActionState(addPersonAction, empty);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-6">
      <label className="text-xs text-ink-soft sm:col-span-2">
        Name as staff know it
        <input name="name" className="field !py-2" placeholder="Ms. Firstname" required />
      </label>
      <label className="text-xs text-ink-soft">
        Role
        <select name="role" className="field !py-2" defaultValue="TEACHER">
          <option value="TEACHER">Teacher</option>
          <option value="OBSERVER">Observer</option>
        </select>
      </label>
      <label className="text-xs text-ink-soft">
        Grade band
        <select name="gradeBand" className="field !py-2" defaultValue="">
          <option value="">Not set</option>
          <option value="KG">KG</option>
          <option value="LOWER_PRIMARY">Lower Primary</option>
          <option value="UPPER_PRIMARY">Upper Primary</option>
        </select>
      </label>
      <label className="text-xs text-ink-soft sm:col-span-2">
        Subjects (comma separated)
        <input name="subjects" className="field !py-2" />
      </label>
      <div className="sm:col-span-6">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add person"}
        </button>
        <Message state={state} />
        <Logins state={state} />
      </div>
    </form>
  );
}
