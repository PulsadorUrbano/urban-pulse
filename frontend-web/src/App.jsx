import { useState } from 'react';
import { IncidentValidationView } from './components/IncidentValidationView';
import { LoginView } from './components/LoginView';

function App() {
  const [currentView, setCurrentView] = useState('login'); // 'login' | 'incidents'
  const [logoutNotification, setLogoutNotification] = useState(null);

  const handleLogout = () => {
    // Revocar sesión y cookie
    localStorage.removeItem('urban_pulse_session_meta');
    setLogoutNotification('Se ha revocado el token JWT y se ha cerrado la cookie HttpOnly (Max-Age=0).');
    setCurrentView('login');
  };

  const handleLoginSuccess = () => {
    setLogoutNotification(null);
    setCurrentView('incidents');
  };

  return (
    <main className="min-h-screen w-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Selector flotante para alternar entre pantallas en modo desarrollo/evaluación */}
      <aside className="fixed bottom-4 right-4 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-full shadow-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold">
        <span className="text-zinc-400 text-[10px] uppercase tracking-wider pl-1.5 pr-1">Módulos:</span>
        <button
          type="button"
          onClick={() => setCurrentView('login')}
          className={`px-3 py-1 rounded-full transition-all text-xs ${
            currentView === 'login'
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
            currentView === 'incidents'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Validación de Incidencias
        </button>
      </aside>

      {currentView === 'login' ? (
        <LoginView 
          onSuccessNavigate={handleLoginSuccess}
          logoutNotification={logoutNotification}
          onClearLogoutNotification={() => setLogoutNotification(null)}
        />
      ) : (
        <IncidentValidationView onNavigateToLogin={handleLogout} />
      )}
    </main>
  );
}

export default App;
