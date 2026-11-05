export const LOGIN_FAILURE_LIMIT = 8;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;

type Bucket = { failures: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function loginThrottleDecision(key: string, now: number): "allow" | "block" {
  const bucket = buckets.get(key);
  if (!bucket) return "allow";
  if (now - bucket.windowStart >= LOGIN_FAILURE_WINDOW_MS) {
    buckets.delete(key);
    return "allow";
  }
  return bucket.failures >= LOGIN_FAILURE_LIMIT ? "block" : "allow";
}

export function recordLoginFailure(key: string, now: number): void {
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= LOGIN_FAILURE_WINDOW_MS) {
    buckets.set(key, { failures: 1, windowStart: now });
  } else {
    bucket.failures += 1;
  }
  if (buckets.size < 2000) return;
  for (const [storedKey, stored] of buckets) {
    if (now - stored.windowStart >= LOGIN_FAILURE_WINDOW_MS) buckets.delete(storedKey);
  }
}

export function clearLoginFailures(key: string): void {
  buckets.delete(key);
}

export function resetLoginThrottle(): void {
  buckets.clear();
}
