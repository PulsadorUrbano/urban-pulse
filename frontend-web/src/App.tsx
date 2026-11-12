import { useState } from 'react';

import { IncidentValidationView } from './components/incident-validation-view';
import { IncidentAssignmentView } from './components/incident-assignment-view';
import { LoginView } from './components/login-view';
import { useAuth } from './hooks/use-auth';
import { useTheme } from './hooks/use-theme';

type AppView = 'login' | 'incidents' | 'assignments';

// Incidencia a validar, indicada en la URL (?incidencia=<uuid>). El backend aún no
// ofrece un listado de incidencias pendientes para el personal municipal.
function readIncidentIdFromUrl(): string | null {
  const value = new URLSearchParams(window.location.search).get('incidencia');
  return value?.trim() || null;
}

function App() {
  const auth = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  // Con una sesión guardada se entra directamente al panel, como al reabrir la app móvil.
  const [currentView, setCurrentView] = useState<AppView>(() => (auth.session ? 'incidents' : 'login'));
  const [logoutNotification, setLogoutNotification] = useState<string | null>(null);
  const [incidentId] = useState<string | null>(readIncidentIdFromUrl);

  const handleLogout = () => {
    auth.logout();
    setLogoutNotification('Sesión cerrada y token eliminado del navegador.');
    setCurrentView('login');
  };

  const handleLoginSuccess = () => {
    setLogoutNotification(null);
    setCurrentView('incidents');
  };

  if (auth.isRestoringSession && !auth.isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  // Sin sesión solo se muestra el login.
  const view: AppView = auth.isAuthenticated ? currentView : 'login';

  return (
    <main className="min-h-screen w-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {auth.isAuthenticated && (
        // Selector flotante para alternar entre pantallas en modo desarrollo/evaluación
        <aside className="fixed bottom-3 left-3 right-3 z-50 flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 sm:bottom-4 sm:left-auto sm:right-4 sm:rounded-full">
          <span className="text-zinc-400 text-[10px] uppercase tracking-wider pl-1.5 pr-1">Módulos:</span>
          <button
            type="button"
            onClick={() => setCurrentView('login')}
            className={`px-3 py-1 rounded-full transition-all text-xs ${
              view === 'login'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Acceso (Login)
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('incidents')}
            className={`px-3 py-1 rounded-full transition-all text-xs ${
              view === 'incidents'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Validación
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('assignments')}
            className={`px-3 py-1 rounded-full transition-all text-xs ${
              view === 'assignments'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Asignaciones
          </button>
        </aside>
      )}

      {view === 'login' || !auth.user ? (
        <LoginView
          auth={auth}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onSuccessNavigate={handleLoginSuccess}
          logoutNotification={logoutNotification}
          onClearLogoutNotification={() => setLogoutNotification(null)}
        />
      ) : view === 'assignments' ? (
        <IncidentAssignmentView
          incidentId={incidentId}
          user={auth.user}
          token={auth.token?.accessToken ?? null}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      ) : (
        <IncidentValidationView
          incidentId={incidentId}
          user={auth.user}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      )}
    </main>
  );
}

export default App;
