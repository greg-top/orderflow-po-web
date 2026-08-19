import type {
  FinishResponse,
  RefinementResponse,
  SessionRequest,
  SessionResponse,
  SessionSnapshotResponse,
  TranscriptResponse,
} from "./types";

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/u, "");
  if (!configured) throw new ApiError(0, "CONFIGURATION_ERROR", "Brak konfiguracji adresu usługi.");
  return configured;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Nie można połączyć się z usługą Product Ownera.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const envelope = body as ErrorEnvelope | null;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? "API_ERROR",
      envelope?.error?.message ?? "Nie udało się wykonać operacji.",
    );
  }
  return body as T;
}

const authorized = (token: string): HeadersInit => ({ Authorization: `Bearer ${token}` });

export const api = {
  startSession(input: SessionRequest): Promise<SessionResponse> {
    return request("/api/session", { method: "POST", body: JSON.stringify(input) });
  },
  session(token: string): Promise<SessionSnapshotResponse> {
    return request("/api/session", { headers: authorized(token) });
  },
  refine(token: string, message: string): Promise<RefinementResponse> {
    return request("/api/refinement", {
      method: "POST",
      headers: authorized(token),
      body: JSON.stringify({ message }),
    });
  },
  finish(token: string): Promise<FinishResponse> {
    return request("/api/session/finish", { method: "POST", headers: authorized(token) });
  },
  transcript(token: string): Promise<TranscriptResponse> {
    return request("/api/session/transcript", { headers: authorized(token) });
  },
};
