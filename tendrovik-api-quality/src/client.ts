const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000/v1";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN ?? "test-jwt-token";

export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  body: T;
  headers: Headers;
}

export async function api<T = unknown>(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, token = AUTH_TOKEN, headers = {} } = opts;
  const url = `${BASE_URL}${path}`;
  const reqHeaders: Record<string, string> = { ...headers };
  if (token) reqHeaders["authorization"] = `Bearer ${token}`;
  if (body !== undefined) reqHeaders["content-type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let parsed: T;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    parsed = (await res.json()) as T;
  } else {
    parsed = (await res.text()) as unknown as T;
  }
  return { status: res.status, ok: res.ok, body: parsed, headers: res.headers };
}

export async function serverIsReachable(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL.replace(/\/v1$/, "/"), {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

export function uuid(): string {
  return crypto.randomUUID();
}
