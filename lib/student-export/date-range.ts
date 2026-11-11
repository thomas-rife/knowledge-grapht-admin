const parseDate = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1
    || date.toISOString().slice(0, 10) !== value) return null;
  return date;
};

export function getExportDateWindow(startDate: unknown, endDate: unknown) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || start > end) return null;

  // A half-open timestamp interval includes the entire selected end date.
  end.setUTCDate(end.getUTCDate() + 1);
  return { startInclusive: start.toISOString(), endExclusive: end.toISOString() };
}
