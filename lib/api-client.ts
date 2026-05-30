// lib/api-client.ts
// Wrapper ringan untuk fetch ke API routes internal
// Dipakai di semua page.tsx sisi client

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new ApiError(json.error ?? "Terjadi kesalahan", res.status);
  }

  return json;
}

// ── GET helpers ──────────────────────────────────────────────────────────────

export const apiGet = <T>(url: string) =>
  request<{ data: T; error: null }>(url);

export const apiList = <T>(url: string) =>
  request<{ data: T[]; total: number; error: null }>(url);

// ── Mutation helpers ─────────────────────────────────────────────────────────

export const apiPost = <T>(url: string, body: unknown) =>
  request<{ data: T; error: null; message?: string }>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const apiPut = <T>(url: string, body: unknown) =>
  request<{ data: T; error: null; message?: string }>(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const apiDelete = (url: string) =>
  request<{ data: null; error: null; message?: string }>(url, {
    method: "DELETE",
  });

// ── Query string builder ─────────────────────────────────────────────────────

export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      q.set(key, String(val));
    }
  }
  const str = q.toString();
  return str ? `?${str}` : "";
}
