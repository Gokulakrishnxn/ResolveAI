/**
 * Tiny className combiner — joins truthy strings with spaces, no extra deps.
 * Mirrors the shape of `clsx` for ergonomics without adding the dependency
 * (the marketing site bundle is kept lean for Lighthouse).
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue): void => {
    if (!v) return;
    if (typeof v === 'string' || typeof v === 'number') {
      out.push(String(v));
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === 'object') {
      for (const key of Object.keys(v)) {
        if (v[key]) out.push(key);
      }
    }
  };
  inputs.forEach(walk);
  return out.join(' ');
}
