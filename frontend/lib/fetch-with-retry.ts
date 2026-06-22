const MAX_RETRIES = 3;

// Retries a fetch request on 429 with exponential backoff (500ms, 1s, 2s).
// Respects Retry-After header when present.
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  attempt = 0,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 429 || attempt >= MAX_RETRIES) return res;

  const retryAfterSec = res.headers.get('Retry-After');
  const delay = retryAfterSec
    ? parseInt(retryAfterSec, 10) * 1000
    : 500 * 2 ** attempt; // 500ms → 1s → 2s

  await new Promise<void>(resolve => setTimeout(resolve, delay));
  return fetchWithRetry(input, init, attempt + 1);
}
