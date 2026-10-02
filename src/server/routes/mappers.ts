import type { Incident, Event } from "../domain/models.js";
import type {
  Incident as IncidentDto,
  Event as EventDto,
} from "../../shared/contracts.js";
const iso = (value: string | Date) => new Date(value).toISOString();
export function incidentDto(value: Incident): IncidentDto {
  return {
    id: value.id,
    title: value.title,
    description: value.description,
    severity: value.severity,
    status: value.status,
    version: value.version,
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
  };
}
export function eventDto(value: Event): EventDto {
  return {
    id: value.id,
    incidentId: value.incidentId,
    actorId: value.actorId,
    action: value.action,
    fromStatus: value.fromStatus,
    toStatus: value.toStatus,
    at: iso(value.at),
  };
}
