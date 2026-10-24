const TZ = "UTC";

function parse(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

export function weekdayName(isoDate: string): string {
  return parse(isoDate).toLocaleDateString("en-GB", { weekday: "long", timeZone: TZ });
}

export function dayMonth(isoDate: string): string {
  return parse(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: TZ });
}

export function fullDate(isoDate: string): string {
  return parse(isoDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}

export function dateRange(start: string, end: string): string {
  const s = parse(start);
  const e = parse(end);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth();
  const startText = s.toLocaleDateString("en-GB", { day: "numeric", ...(sameMonth ? {} : { month: "long" }), timeZone: TZ });
  const endText = e.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
  return `${startText}–${endText}`;
}
