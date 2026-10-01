import type { Incident, Status } from "../../shared/domain.js";
import { statusLabels, statusTransitions } from "../incident-status.js";
import { IncidentHistory } from "./IncidentHistory.js";

interface IncidentCardProps {
  incident: Incident;
  canEdit: boolean;
  busy: boolean;
  onChangeStatus: (incident: Incident, status: Status) => Promise<boolean>;
  onMessage: (message: string) => void;
}
export function IncidentCard({
  incident,
  canEdit,
  busy,
  onChangeStatus,
  onMessage,
}: IncidentCardProps) {
  return (
    <article>
      <h3>{incident.title}</h3>
      <p>{incident.description}</p>
      <p>
        {statusLabels[incident.status]} · {incident.severity} · version{" "}
        {incident.version}
      </p>
      {canEdit && (
        <div className="actions">
          {statusTransitions[incident.status].map((status) => (
            <button
              key={status}
              disabled={busy}
              onClick={() => void onChangeStatus(incident, status)}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
      )}
      <IncidentHistory id={incident.id} report={onMessage} />
    </article>
  );
}
