/** Small client-side fetch helper: unwraps { success, data | error }. */
export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}
