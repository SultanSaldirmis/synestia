/**
 * Firestore rejects `undefined` values.
 * This helper deep-cleans objects/arrays by removing undefined fields.
 */
export function sanitizeData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((x) => sanitizeData(x))
      .filter((x) => x !== undefined) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = sanitizeData(v);
    }
    return out as T;
  }
  return value;
}

