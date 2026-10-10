import { useWorkspace } from "./use-workspace.js";
import { LoginForm } from "./features/session/LoginForm.js";
import { IncidentForm } from "./features/incidents/components/IncidentForm.js";
import { IncidentList } from "./features/incidents/components/IncidentList.js";
export function App() {
  const {
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
    refresh,
    loadMore,
  } = useWorkspace();

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
              onRefresh={refresh}
              onLoadMore={loadMore}
              onChangeStatus={changeStatus}
              onError={handleError}
            />
          </section>
        )}
      </main>
    </>
  );
}
