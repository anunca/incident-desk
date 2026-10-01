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
  createdAt: string;
  updatedAt: string;
}
export interface Event {
  id: string;
  incidentId: string;
  actorId: string;
  action: string;
  fromStatus: Status | null;
  toStatus: Status;
  at: string;
}
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
}
export class DomainError extends Error {
  constructor(
    public status: number,
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
    throw new DomainError(409, "Invalid status transition");
}
export interface Store {
  ready(): Promise<void>;
  user(email: string): Promise<User | undefined>;
  session(hash: string): Promise<Actor | undefined>;
  saveSession(hash: string, actor: Actor, expires: Date): Promise<void>;
  deleteSession(hash: string): Promise<void>;
  list(limit: number, offset: number): Promise<Incident[]>;
  get(id: string): Promise<Incident | undefined>;
  create(
    input: Pick<Incident, "title" | "description" | "severity">,
    actor: Actor,
  ): Promise<Incident>;
  transition(
    id: string,
    status: Status,
    version: number,
    actor: Actor,
  ): Promise<Incident>;
  events(id: string): Promise<Event[]>;
}
