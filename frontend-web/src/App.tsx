import { useState } from 'react';

import { IncidentAssignmentView } from './components/incident-assignment-view';
import { IncidentListView } from './components/incident-list-view';
import { IncidentValidationView } from './components/incident-validation-view';
import { LoginView } from './components/login-view';
import { useAuth } from './hooks/use-auth';
import { useTheme } from './hooks/use-theme';

function readIncidentIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('incidencia')?.trim() || null;
}

function App() {
  const auth = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [logoutNotification, setLogoutNotification] = useState<string | null>(null);
  const [incidentId, setIncidentId] = useState<string | null>(readIncidentIdFromUrl);
  const [showAssignments, setShowAssignments] = useState(false);
  const [hasEnteredDemo, setHasEnteredDemo] = useState(auth.user?.source === 'mock');

  const handleBack = () => {
    setIncidentId(null);
    setShowAssignments(false);
  };

  const handleLogout = () => {
    auth.logout();
    handleBack();
    setHasEnteredDemo(false);
    setLogoutNotification('Sesión cerrada y token eliminado del navegador.');
  };

  if (auth.isRestoringSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );
  }

  const user = auth.user;
  const token = user?.source === 'backend' ? auth.token?.accessToken ?? null : null;
  const canAssign = user?.role === 'admin' || user?.role === 'administrative';
  const viewProps = { isDarkMode, onToggleTheme: toggleTheme, onLogout: handleLogout };

  return (
    <main className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      {!user || (user.source === 'mock' && !hasEnteredDemo) ? (
        <LoginView
          auth={auth}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onSuccessNavigate={() => {
            setLogoutNotification(null);
            setHasEnteredDemo(auth.user?.source === 'mock');
          }}
          logoutNotification={logoutNotification}
          onClearLogoutNotification={() => setLogoutNotification(null)}
        />
      ) : incidentId || showAssignments ? (
        <>
          <nav aria-label="Navegación de incidencias" className="flex flex-wrap gap-4 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 sm:px-6">
            <button type="button" className="hover:underline" onClick={handleBack}>Volver al listado</button>
            {incidentId && token && canAssign && (
              <button type="button" className="hover:underline" onClick={() => setShowAssignments(!showAssignments)}>
                {showAssignments ? 'Volver al detalle' : 'Gestionar asignación'}
              </button>
            )}
          </nav>
          {showAssignments ? (
            <IncidentAssignmentView incidentId={incidentId} user={user} token={token} {...viewProps} />
          ) : (
            <IncidentValidationView key={incidentId} incidentId={incidentId} user={user} token={token} {...viewProps} />
          )}
        </>
      ) : (
        <IncidentListView
          user={user}
          token={token}
          onOpenIncident={setIncidentId}
          onOpenAssignmentDemo={import.meta.env.DEV && canAssign ? () => setShowAssignments(true) : undefined}
          {...viewProps}
        />
      )}
    </main>
  );
}

export default App;
