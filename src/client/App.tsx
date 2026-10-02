import { useCallback, useEffect, useState } from "react";
import type { Incident, Role, Status } from "../shared/domain.js";
import {
  api,
  ApiError,
  PAGE_SIZE,
  type Credentials,
  type NewIncident,
} from "./api.js";
import { LoginForm } from "./components/LoginForm.js";
import { IncidentForm } from "./components/IncidentForm.js";
import { IncidentList } from "./components/IncidentList.js";

export function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const session = await api.currentSession();
        const result = await api.listIncidents();
        if (!active) return;
        setRole(session.role);
        setIncidents(result.items);
        setHasMore(result.items.length === PAGE_SIZE);
      } catch (error) {
        if (active && !(error instanceof ApiError && error.status === 401))
          setMessage(
            "Impossible de restaurer la session. Réessaie de te connecter.",
          );
      } finally {
        if (active) setInitializing(false);
      }
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  async function loadIncidents(append = false) {
    const result = await api.listIncidents(append ? incidents.length : 0);
    setIncidents((previous) =>
      append ? [...previous, ...result.items] : result.items,
    );
    setHasMore(result.items.length === PAGE_SIZE);
  }

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401 && role !== null) {
        setRole(null);
        setIncidents([]);
        setHasMore(false);
        setMessage("Ta session a expiré. Reconnecte-toi.");
      } else
        setMessage(
          error instanceof Error ? error.message : "Une erreur est survenue.",
        );
    },
    [role],
  );

  async function perform(action: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    try {
      await action();
      return true;
    } catch (error) {
      handleError(error);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function login(credentials: Credentials) {
    return perform(async () => {
      const session = await api.login(credentials);
      const result = await api.listIncidents();
      setIncidents(result.items);
      setHasMore(result.items.length === PAGE_SIZE);
      setRole(session.role);
      setMessage("Connexion réussie.");
    });
  }

  function logout() {
    return perform(async () => {
      await api.logout();
      setRole(null);
      setIncidents([]);
      setHasMore(false);
      setMessage("Déconnexion réussie.");
    });
  }

  function createIncident(incident: NewIncident) {
    return perform(async () => {
      await api.createIncident(incident);
      setMessage("Incident créé.");
      await loadIncidents();
    });
  }

  function changeStatus(incident: Incident, status: Status) {
    return perform(async () => {
      await api.changeStatus(incident, status);
      setMessage("Statut modifié.");
      await loadIncidents();
    });
  }

  return (
    <>
      <header>
        <span className="brand">Incident Desk</span>
        <span>Suivi opérationnel</span>
        {role && (
          <button disabled={busy} onClick={() => void logout()}>
            Déconnexion
          </button>
        )}
      </header>
      <main>
        <h1>Gardez le contrôle des incidents.</h1>
        <p>Déclarez, suivez et résolvez les incidents de vos services.</p>
        <p id="message" role="status" aria-live="polite">
          {message}
        </p>
        {initializing ? (
          <p role="status">Vérification de la session…</p>
        ) : !role ? (
          <LoginForm busy={busy} onLogin={login} />
        ) : (
          <section>
            {role !== "reader" && (
              <IncidentForm busy={busy} onCreate={createIncident} />
            )}
            <IncidentList
              incidents={incidents}
              canEdit={role !== "reader"}
              busy={busy}
              hasMore={hasMore}
              onRefresh={() => perform(() => loadIncidents())}
              onLoadMore={() => perform(() => loadIncidents(true))}
              onChangeStatus={changeStatus}
              onError={handleError}
            />
          </section>
        )}
      </main>
    </>
  );
}
