import type {
  IncidentRepository,
  SessionRepository,
  HealthProbe,
} from "../src/server/application/ports.js";
import { randomUUID } from "node:crypto";
import {
  assertTransition,
  DomainError,
  type Actor,
  type Incident,
  type Event,
  type User,
  type Status,
} from "../src/server/domain/models.js";
export class MemoryStore
  implements IncidentRepository, SessionRepository, HealthProbe
{
  users: User[] = [];
  sessions = new Map<string, { actor: Actor; expires: Date }>();
  items: Incident[] = [];
  history: Event[] = [];
  available = true;
  async ready() {
    if (!this.available) throw new Error("Database failed");
  }
  async user(email: string) {
    return this.users.find((u) => u.email === email);
  }
  async session(hash: string) {
    const s = this.sessions.get(hash);
    return s && s.expires.getTime() > Date.now() ? s.actor : undefined;
  }
  async saveSession(hash: string, actor: Actor, expires: Date) {
    this.sessions.set(hash, { actor, expires });
  }
  async deleteSession(hash: string) {
    this.sessions.delete(hash);
  }
  async list(limit: number, offset: number) {
    return this.items.slice(offset, offset + limit);
  }
  async get(id: string) {
    return this.items.find((i) => i.id === id);
  }
  async create(
    input: Pick<Incident, "title" | "description" | "severity">,
    actor: Actor,
  ) {
    const at = new Date().toISOString();
    const item: Incident = {
      ...input,
      id: randomUUID(),
      status: "open",
      version: 1,
      createdAt: at,
      updatedAt: at,
    };
    this.items.unshift(item);
    this.history.push({
      id: randomUUID(),
      incidentId: item.id,
      actorId: actor.id,
      action: "created",
      fromStatus: null,
      toStatus: "open",
      at,
    });
    return item;
  }
  async transition(id: string, status: Status, version: number, actor: Actor) {
    const item = await this.get(id);
    if (!item) throw new DomainError("not_found", "Incident not found");
    if (item.version !== version)
      throw new DomainError(
        "conflict",
        "Incident changed; reload before retrying",
      );
    assertTransition(item.status, status);
    const fromStatus = item.status;
    item.status = status;
    item.version++;
    this.history.push({
      id: randomUUID(),
      incidentId: id,
      actorId: actor.id,
      action: "status_changed",
      fromStatus,
      toStatus: status,
      at: new Date().toISOString(),
    });
    return item;
  }
  async events(id: string) {
    return this.history.filter((e) => e.incidentId === id);
  }
}
