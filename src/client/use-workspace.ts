import { useCallback, useEffect, useState } from "react";
import type { Incident, Role, Status } from "../shared/contracts.js";
import {
  api,
  ApiError,
  PAGE_SIZE,
  type Credentials,
  type NewIncident,
} from "./api.js";
export function useWorkspace() {
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

  return {
    role,
    incidents,
    hasMore,
    message,
    busy,
    initializing,
    login,
    logout,
    createIncident,
    changeStatus,
    handleError,
    refresh: () => perform(() => loadIncidents()),
    loadMore: () => perform(() => loadIncidents(true)),
  };
}
