import { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, LogOut, Moon, ShieldCheck, SlidersHorizontal, Sun } from 'lucide-react';

import type { useAuth } from '../hooks/use-auth';
import { OFFLINE_FALLBACK_NOTICE } from '../services/auth.service';
import type { MockUser } from '../types/user';
import { displayName } from '../utils/display-name';
import { DemoAccounts } from './demo-accounts';
import { LoginForm } from './login-form';
import { TechnicalConsole } from './technical-console';

interface LoginViewProps {
  auth: ReturnType<typeof useAuth>;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onSuccessNavigate?: () => void;
  logoutNotification?: string | null;
  onClearLogoutNotification?: () => void;
}

export function LoginView({
  auth,
  isDarkMode,
  onToggleTheme,
  onSuccessNavigate,
  logoutNotification,
  onClearLogoutNotification,
}: LoginViewProps) {
  const { user, token, isAuthenticated, loading, error, notice, login, logout, resetError } = auth;

  // El formulario y las cuentas de prueba comparten las credenciales.
  const [usernameOrEmail, setUsernameOrEmail] = useState(import.meta.env.DEV ? 'admin' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'admin' : '');
  const [showTechModal, setShowTechModal] = useState(false);

  const handleSubmit = async (rememberMe: boolean) => {
    if (!usernameOrEmail.trim() || !password.trim()) return;

    const result = await login({ usernameOrEmail, password, rememberMe });

    // Si hubo aviso (backend sin conexión), se queda en esta pantalla para que se lea.
    if (result.ok && !result.notice && onSuccessNavigate) {
      onSuccessNavigate();
    }
  };

  const handleSelectDemoUser = (demoUser: MockUser) => {
    setUsernameOrEmail(demoUser.username);
    setPassword(demoUser.password);
    resetError();
  };

  const isBackendToken = token?.source === 'backend';
  const visibleNotice = notice ?? (isAuthenticated && token?.source === 'mock' ? OFFLINE_FALLBACK_NOTICE : null);

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans">
      
      {/* 1. INSTITUTIONAL HEADER */}
      <header className="h-16 flex justify-between items-center px-6 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-md flex items-center justify-center shadow-xs">
            <span className="text-white dark:text-zinc-900 font-black text-sm">M</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-zinc-900 dark:text-zinc-100 tracking-tight">
              Pulsador Urbano
            </h1>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Ayuntamiento de Málaga
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Architecture demonstration button */}
          <button
            type="button"
            onClick={() => setShowTechModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs font-semibold shadow-xs transition-all"
            title="Open technical inspection console"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            <span className="hidden sm:inline">Technical Inspection</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-500">Demo</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <button 
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
            title="Toggle Light / Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT: AUTHENTICATION FORM */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[420px]">
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-7 sm:p-8">
            
            {/* Form header */}
            <div className="mb-7 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Iniciar sesión
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                Acceso corporativo a la plataforma de gestión municipal
              </p>
              <span
                className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold ${
                  isBackendToken || !isAuthenticated
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
                title="La URL del backend se configura con VITE_BACKEND_URL"
              >
                {!isAuthenticated ? 'Backend real' : isBackendToken ? 'Conectado al backend' : 'Datos simulados (sin conexión)'}
              </span>
            </div>

            {/* Logout notification */}
            {logoutNotification && (
              <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1">
                  <p className="font-semibold">Sesión finalizada de forma segura</p>
                  <p className="text-[11px] mt-0.5 opacity-90">{logoutNotification}</p>
                </div>
                {onClearLogoutNotification && (
                  <button
                    type="button"
                    onClick={onClearLogoutNotification}
                    className="text-emerald-700 dark:text-emerald-400 hover:opacity-70 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Error alert if credentials fail */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-red-800 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-semibold">{error}</p>
                </div>
              </div>
            )}

            {/* Aviso de respaldo: el backend no respondió y se usan datos simulados */}
            {visibleNotice && (
              <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="font-semibold">{visibleNotice}</p>
              </div>
            )}

            {/* Authenticated user welcome card */}
            {isAuthenticated && user ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-center">
                  <div className="w-8 h-8 mx-auto mb-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Sesión iniciada
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Conectado como <strong className="text-zinc-900 dark:text-zinc-100">{displayName(user)}</strong>
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="px-2.5 py-0.5 bg-zinc-200/80 dark:bg-zinc-800 text-[11px] font-semibold rounded text-zinc-700 dark:text-zinc-300">
                      {(user.source === 'mock' ? user.departmentName : undefined) ?? `Rol: ${user.role}`}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      isBackendToken
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {isBackendToken ? 'JWT del backend' : 'Token simulado'}
                    </span>
                  </div>
                </div>

                {onSuccessNavigate && (
                  <button
                    type="button"
                    onClick={onSuccessNavigate}
                    className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <span>Acceder al Panel de Incidencias</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            ) : (
              /* Standard login form */
              <LoginForm
                usernameOrEmail={usernameOrEmail}
                password={password}
                loading={loading}
                onUsernameOrEmailChange={setUsernameOrEmail}
                onPasswordChange={setPassword}
                onSubmit={(rememberMe) => void handleSubmit(rememberMe)}
              />
            )}

            <DemoAccounts onSelect={handleSelectDemoUser} />

          </div>

        </div>
      </main>

      {/* 3. INSTITUTIONAL FOOTER */}
      <footer className="h-14 border-t border-zinc-200/80 dark:border-zinc-800/60 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0 gap-2">
        <div>
          © 2026 Ayuntamiento de Málaga • Todos los derechos reservados
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <a href="#sede" onClick={(e) => e.preventDefault()} className="hover:underline">Sede Electrónica</a>
          <span>•</span>
          <a href="#aviso" onClick={(e) => e.preventDefault()} className="hover:underline">Aviso Legal</a>
          <span>•</span>
          <a href="#privacidad" onClick={(e) => e.preventDefault()} className="hover:underline">Política de Privacidad</a>
        </div>
      </footer>

      {/* 4. TECHNICAL INSPECTION MODAL FOR ARCHITECTURE DEMO */}
      {showTechModal && <TechnicalConsole auth={auth} onClose={() => setShowTechModal(false)} />}

    </div>
  );
};
