const API_BASE = import.meta.env.API_URL ?? 'http://mongil-api:3001';

export async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}/api/public${path}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    console.error(`API error: ${res.status} ${url}`);
    throw new Error(`API ${path}: ${res.status}`);
  }
  return res.json();
}
