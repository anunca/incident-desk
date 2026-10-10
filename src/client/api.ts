import type { Incident, Event, Role, Status } from "../shared/contracts.js";

export type { Credentials, NewIncident } from "../shared/contracts.js";
import type { Credentials, NewIncident } from "../shared/contracts.js";
const PAGE_SIZE = 20;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "incident-desk",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(
      response.status,
      error?.error ?? "Le service est temporairement indisponible.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  currentSession: () => request<{ role: Role }>("/api/session"),
  login: (credentials: Credentials) =>
    request<{ role: Role }>("/api/session", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  logout: () => request<void>("/api/session", { method: "DELETE" }),
  listIncidents: (offset = 0) =>
    request<{ items: Incident[] }>(
      `/api/incidents?limit=${PAGE_SIZE}&offset=${offset}`,
    ),
  createIncident: (incident: NewIncident) =>
    request<Incident>("/api/incidents", {
      method: "POST",
      body: JSON.stringify(incident),
    }),
  changeStatus: (incident: Incident, status: Status) =>
    request<Incident>(`/api/incidents/${incident.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, version: incident.version }),
    }),
  history: (id: string) =>
    request<{ items: Event[] }>(`/api/incidents/${id}/events`),
};
export { PAGE_SIZE };
