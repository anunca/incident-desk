export type Role = "reader" | "operator" | "admin";
export type Status = "open" | "investigating" | "resolved";
export interface Actor {
  id: string;
  role: Role;
}
export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: Status;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}
export interface Event {
  id: string;
  incidentId: string;
  actorId: string;
  action: string;
  fromStatus: Status | null;
  toStatus: Status;
  at: string | Date;
}
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
}
export class DomainError extends Error {
  constructor(
    public code: "unauthenticated" | "forbidden" | "not_found" | "conflict",
    message: string,
  ) {
    super(message);
  }
}
export function assertTransition(from: Status, to: Status) {
  const allowed: Record<Status, Status[]> = {
    open: ["investigating", "resolved"],
    investigating: ["open", "resolved"],
    resolved: ["open"],
  };
  if (!allowed[from].includes(to))
    throw new DomainError("conflict", "Invalid status transition");
}
