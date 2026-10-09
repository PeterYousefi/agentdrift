export const MB = 1024 * 1024;
export const GB = 1024 * MB;

export function fmtBytes(b: number, digits = 1): string {
  if (b >= GB) return `${(b / GB).toFixed(digits)} GB`;
  if (b >= MB) return `${(b / MB).toFixed(b >= 100 * MB ? 0 : digits)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

function utcIso(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function fmtTime(iso: string): string {
  return utcIso(iso)?.slice(11, 19) ?? "—";
}

export function fmtDateTime(iso: string): string {
  const value = utcIso(iso);
  return value ? `${value.slice(0, 10)} ${value.slice(11, 19)} UTC` : "—";
}

export function baselinePeriod(history: { day: string }[]): string {
  if (!history.length) return "No training samples";
  const dates = history.map((row) => Date.parse(row.day)).filter(Number.isFinite);
  if (!dates.length) return "No valid training timestamps";
  const minutes = Math.round((Math.max(...dates) - Math.min(...dates)) / 60000);
  return `${history.length} training samples · ${Math.floor(minutes / 60)}h ${minutes % 60}m span · UTC`;
}

export function fmtScore(s: number): string {
  return s.toFixed(2);
}

/** Deterministic PRNG so fixtures never change between renders. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
