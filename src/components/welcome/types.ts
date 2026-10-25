import type { Level } from "@/lib/judgement";
import type { VisitStatus } from "@/lib/queries";

export interface WelcomeData {
  week: {
    label: string;
    count: number;
    rows: { day: string; period: number; teacherName: string; className: string; subject: string; status: VisitStatus; ratedCount: number }[];
  } | null;
  criterion: { code: string; name: string; descriptors: Record<Level, string> } | null;
  firstVisitHref: string | null;
  /** The next visit's teacher and class, used in the example letter and notice. */
  example: { teacherName: string; className: string; subject: string } | null;
}
