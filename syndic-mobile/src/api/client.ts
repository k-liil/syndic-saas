import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const TOKEN_KEY = "syndic_token";

// ─── Token storage ──────────────────────────────────────────────────────────

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function buildHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers = await buildHeaders();
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new ApiError(res.status, errorText);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export type LoginResponse = {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string | null;
    organizationName: string | null;
    ownerId: string | null;
    unitId: string | null;
    unitRef: string | null;
  };
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/mobile/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error ?? "LOGIN_FAILED");
  }

  return res.json();
}

export async function fetchMe() {
  return request<{
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string | null;
    organizationName: string | null;
    ownerId: string | null;
    unitId: string | null;
    unitRef: string | null;
  }>("GET", "/api/mobile/me");
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function fetchDashboard(year?: number) {
  return request<Record<string, unknown>>(
    "GET",
    "/api/dashboard",
    undefined,
    year ? { year: String(year) } : undefined
  );
}

// ─── Owner ledger (cotisations) ──────────────────────────────────────────────

export async function fetchOwnerLedger(ownerId: string) {
  return request<Record<string, unknown>>("GET", `/api/owners/${ownerId}/ledger`);
}

// ─── Claims (réclamations) ───────────────────────────────────────────────────

export async function fetchClaims() {
  return request<unknown[]>("GET", "/api/claims");
}

export async function createClaim(payload: {
  title: string;
  description: string;
  category: string;
  unitId: string;
  ownerId: string;
}) {
  return request<{ id: string }>("POST", "/api/claims", payload);
}

export async function addClaimComment(claimId: string, content: string) {
  return request<{ id: string }>("PATCH", `/api/claims/${claimId}`, { comment: content });
}
