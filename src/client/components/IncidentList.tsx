import type { Incident, Status } from "../../shared/domain.js";
import { IncidentCard } from "./IncidentCard.js";

interface IncidentListProps {
  incidents: Incident[];
  canEdit: boolean;
  busy: boolean;
  hasMore: boolean;
  onRefresh: () => Promise<boolean>;
  onLoadMore: () => Promise<boolean>;
  onChangeStatus: (incident: Incident, status: Status) => Promise<boolean>;
  onMessage: (message: string) => void;
}
export function IncidentList({
  incidents,
  canEdit,
  busy,
  hasMore,
  onRefresh,
  onLoadMore,
  onChangeStatus,
  onMessage,
}: IncidentListProps) {
  return (
    <section>
      <h2>Incidents récents</h2>
      <button disabled={busy} onClick={() => void onRefresh()}>
        Actualiser
      </button>
      {!incidents.length && <p>Aucun incident.</p>}
      {incidents.map((incident) => (
        <IncidentCard
          key={incident.id}
          incident={incident}
          canEdit={canEdit}
          busy={busy}
          onChangeStatus={onChangeStatus}
          onMessage={onMessage}
        />
      ))}
      {hasMore && (
        <button disabled={busy} onClick={() => void onLoadMore()}>
          Voir la suite
        </button>
      )}
    </section>
  );
}
