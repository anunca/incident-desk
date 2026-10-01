import { useState } from "react";
import type { Event } from "../../shared/domain.js";
import { api } from "../api.js";
import { statusLabels } from "../incident-status.js";

export function IncidentHistory({
  id,
  report,
}: {
  id: string;
  report: (text: string) => void;
}) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <details
      onToggle={async (event) => {
        if (!event.currentTarget.open || events || loading) return;
        setLoading(true);
        try {
          setEvents((await api.history(id)).items);
        } catch (error) {
          report((error as Error).message);
        } finally {
          setLoading(false);
        }
      }}
    >
      <summary>Historique</summary>
      {loading && <p>Chargement…</p>}
      <ul>
        {events?.map((event) => (
          <li key={event.id}>
            {new Date(event.at).toLocaleString("fr-FR")} — {event.action} →{" "}
            {statusLabels[event.toStatus]}
          </li>
        ))}
      </ul>
    </details>
  );
}
