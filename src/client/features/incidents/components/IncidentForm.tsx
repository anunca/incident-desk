import type { FormEvent } from "react";
import type { NewIncident } from "../../../api.js";

interface IncidentFormProps {
  busy: boolean;
  onCreate: (incident: NewIncident) => Promise<boolean>;
}
export function IncidentForm({ busy, onCreate }: IncidentFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const succeeded = await onCreate({
      title: String(data.get("title")),
      description: String(data.get("description")),
      severity: String(data.get("severity")) as NewIncident["severity"],
    });
    if (succeeded) form.reset();
  }
  return (
    <form onSubmit={handleSubmit}>
      <h2>Nouvel incident</h2>
      <label>
        Titre
        <input name="title" maxLength={160} required />
      </label>
      <label>
        Description
        <textarea name="description" maxLength={4000} />
      </label>
      <label>
        Sévérité
        <select name="severity">
          <option value="low">Faible</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
          <option value="critical">Critique</option>
        </select>
      </label>
      <button disabled={busy}>Créer l’incident</button>
    </form>
  );
}
