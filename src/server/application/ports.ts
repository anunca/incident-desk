import type { Actor, User, Incident, Event, Status } from "../domain/models.js";
export interface IncidentRepository {
  list(limit: number, offset: number): Promise<Incident[]>;
  get(id: string): Promise<Incident | undefined>;
  // Both methods atomically persist the incident and its audit event.
  create(
    input: Pick<Incident, "title" | "description" | "severity">,
    actor: Actor,
  ): Promise<Incident>;
  // Version/transition checks occur under the same lock as the write.
  transition(
    id: string,
    status: Status,
    version: number,
    actor: Actor,
  ): Promise<Incident>;
  events(id: string): Promise<Event[]>;
}
export interface SessionRepository {
  user(email: string): Promise<User | undefined>;
  session(hash: string): Promise<Actor | undefined>;
  saveSession(hash: string, actor: Actor, expires: Date): Promise<void>;
  deleteSession(hash: string): Promise<void>;
}
export interface HealthProbe {
  ready(): Promise<void>;
}
export interface Dependencies {
  incidents: IncidentRepository;
  sessions: SessionRepository;
  health: HealthProbe;
}
