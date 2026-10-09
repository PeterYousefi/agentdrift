export const MB = 1024 * 1024;
export const GB = 1024 * MB;

export function fmtBytes(b: number, digits = 1): string {
  if (b >= GB) return `${(b / GB).toFixed(digits)} GB`;
  if (b >= MB) return `${(b / MB).toFixed(b >= 100 * MB ? 0 : digits)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

export function fmtTime(iso: string): string {
  return iso.slice(11, 19);
}

export function fmtDateTime(iso: string): string {
  const d = iso.slice(5, 10).replace("-", "/");
  return `${d} ${iso.slice(11, 16)}`;
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
