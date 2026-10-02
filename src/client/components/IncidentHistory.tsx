import { useEffect, useState } from "react";
import type { Event } from "../../shared/domain.js";
import { api } from "../api.js";
import { statusLabels } from "../incident-status.js";

export function IncidentHistory({
  id,
  version,
  report,
}: {
  id: string;
  version: number;
  report: (error: unknown) => void;
}) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setEvents(null);
    setLoading(open);
    if (open) {
      void api
        .history(id)
        .then((result) => {
          if (active) setEvents(result.items);
        })
        .catch((error) => {
          if (active) report(error);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    // A replaced version or closed panel must not accept an older response.
    return () => {
      active = false;
    };
  }, [id, version, open, report]);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
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
