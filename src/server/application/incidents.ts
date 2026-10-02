import {
  DomainError,
  type Actor,
  type Incident,
  type Status,
} from "../domain/models.js";
import type { IncidentRepository } from "./ports.js";
function requireWrite(actor: Actor) {
  if (actor.role === "reader")
    throw new DomainError("forbidden", "Write access required");
}
export function createIncidentUseCases(repository: IncidentRepository) {
  return {
    list: (limit: number, offset: number) => repository.list(limit, offset),
    async get(id: string) {
      const incident = await repository.get(id);
      if (!incident) throw new DomainError("not_found", "Incident not found");
      return incident;
    },
    async create(
      input: Pick<Incident, "title" | "description" | "severity">,
      actor: Actor,
    ) {
      requireWrite(actor);
      return repository.create(input, actor);
    },
    async changeStatus(
      id: string,
      status: Status,
      version: number,
      actor: Actor,
    ) {
      requireWrite(actor);
      // Do not read/check outside the transaction: that would race another writer.
      return repository.transition(id, status, version, actor);
    },
    async history(id: string) {
      if (!(await repository.get(id)))
        throw new DomainError("not_found", "Incident not found");
      return repository.events(id);
    },
  };
}
export type IncidentUseCases = ReturnType<typeof createIncidentUseCases>;
