import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { parseJwt } from '../services/authService';
import { 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Database,
  Code2,
  RefreshCw,
  LogOut,
  Key,
  Cookie,
  SlidersHorizontal,
  X,
  ShieldCheck,
  ChevronRight,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface LoginViewProps {
  onSuccessNavigate?: () => void;
  logoutNotification?: string | null;
  onClearLogoutNotification?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ 
  onSuccessNavigate, 
  logoutNotification,
  onClearLogoutNotification 
}) => {
  const {
    user,
    token,
    tokenSource,
    verifiedClaims,
    cookieInfo,
    isAuthenticated,
    loading,
    validatingToken,
    validationResult,
    error,
    login,
    logout,
    validateTokenWithBackend,
    resetError,
    demoUsers
  } = useAuth();

  // Estados del formulario institucional
  const [usernameOrEmail, setUsernameOrEmail] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Tema claro/oscuro
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modal de inspección técnica para demostración interna
  const [showTechModal, setShowTechModal] = useState(false);
  const [techTab, setTechTab] = useState<'jwt' | 'cookie' | 'nest'>('jwt');

  // Selector desplegable discreto de cuentas demo
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password.trim()) return;

    const ok = await login({
      usernameOrEmail,
      password,
      rememberMe
    });

    if (ok && onSuccessNavigate) {
      onSuccessNavigate();
    }
  };

  const handleSelectDemoUser = (username: string) => {
    setUsernameOrEmail(username);
    const selected = demoUsers.find(u => u.username === username);
    setPassword(selected ? (selected as any).passwordHash : 'malaga2026');
    resetError();
    setShowDemoAccounts(false);
  };

  const parsedToken = token ? parseJwt(token) : null;

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans">
      
      {/* 1. CABECERA INSTITUCIONAL */}
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
          {/* Botón discreto para demostración de arquitectura (para compañeros y profesor) */}
          <button
            type="button"
            onClick={() => setShowTechModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs font-semibold shadow-xs transition-all"
            title="Abrir consola de inspección para demostración técnica"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            <span className="hidden sm:inline">Inspección Técnica</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-500">Demo</span>
          </button>

          {/* Toggle de Modo Claro / Modo Oscuro */}
          <button 
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
            title="Alternar Modo Oscuro / Claro"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL: FORMULARIO CENTRADO Y REALISTA */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[420px]">
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-7 sm:p-8">
            
            {/* Cabecera del formulario */}
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
            </div>

            {/* Notificación de cierre de sesión exitoso */}
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

            {/* Alerta de error si las credenciales fallan */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-red-800 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-semibold">{error}</p>
                </div>
              </div>
            )}

            {/* Si ya está autenticado, muestra tarjeta de bienvenida y acción rápida */}
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
                    Conectado como <strong className="text-zinc-900 dark:text-zinc-100">{user.fullName}</strong>
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="px-2.5 py-0.5 bg-zinc-200/80 dark:bg-zinc-800 text-[11px] font-semibold rounded text-zinc-700 dark:text-zinc-300">
                      {user.departmentName || `Rol: ${user.role}`}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      tokenSource === 'backend'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {tokenSource === 'backend' ? 'JWT NestJS Real' : 'JWT Emulado'}
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
              /* Formulario estándar de login */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Usuario o correo corporativo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      placeholder="ej. admin o usuario@malaga.es"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Contraseña
                    </label>
                    <a href="#recuperar" onClick={(e) => e.preventDefault()} className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                      ¿Has olvidado tu contraseña?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-100 accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      Mantener sesión iniciada
                    </span>
                  </label>
                </div>

                {/* Botón limpio y realista */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validando credenciales...</span>
                      </>
                    ) : (
                      <span>Iniciar sesión</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Acceso rápido discreto a usuarios de prueba (útil para la evaluación y compañeros) */}
            <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                className="w-full flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors font-medium"
              >
                <span>Cuentas institucionales para pruebas</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDemoAccounts ? 'rotate-90' : ''}`} />
              </button>

              {showDemoAccounts && (
                <div className="mt-3 space-y-1.5">
                  {demoUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectDemoUser(u.username)}
                      className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {u.fullName}
                          {u.role === 'admin' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold uppercase">
                              Seed NestJS
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">{u.role} • {u.username}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-200/70 dark:bg-zinc-700/70 text-zinc-700 dark:text-zinc-300 rounded font-medium">
                        Cargar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </main>

      {/* 3. PIE DE PÁGINA INSTITUCIONAL REALISTA */}
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

      {/* 4. MODAL DE INSPECCIÓN TÉCNICA (SOLO VISIBLE CUANDO QUEREMOS ENSEÑAR EL TOKEN Y COOKIES A LOS COMPAÑEROS) */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Consola de Demostración Técnica
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded">
                      Exclusivo Presentación
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Inspección del token JWT único, validación contra NestJS y ciclo de cookies HttpOnly
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTechModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de pestañas técnicas */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20">
              <button
                type="button"
                onClick={() => setTechTab('jwt')}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  techTab === 'jwt'
                    ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                Token JWT & Validación Backend
              </button>

              <button
                type="button"
                onClick={() => setTechTab('cookie')}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  techTab === 'cookie'
                    ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <Cookie className="w-3.5 h-3.5" />
                Apertura y Cierre de Cookies
              </button>

              <button
                type="button"
                onClick={() => setTechTab('nest')}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  techTab === 'nest'
                    ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                Arquitectura NestJS + DB
              </button>
            </div>

            {/* Contenido de la pestaña */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
              
              {/* TAB 1: TOKEN JWT */}
              {techTab === 'jwt' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Token JWT emitido (RFC 7519)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        tokenSource === 'backend'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                      }`}>
                        {tokenSource === 'backend' ? '● Origen: Backend NestJS (Real)' : '○ Origen: Simulación Mock Fallback'}
                      </span>
                    </div>
                  </div>

                  {token ? (
                    <>
                      <div className="p-3 bg-zinc-900 dark:bg-black rounded-xl border border-zinc-800 text-xs font-mono break-all leading-relaxed">
                        <span className="text-rose-400 font-semibold">{token.split('.')[0]}</span>
                        <span className="text-white">.</span>
                        <span className="text-indigo-400 font-semibold">{token.split('.')[1]}</span>
                        <span className="text-white">.</span>
                        <span className="text-emerald-400 font-semibold">{token.split('.')[2]}</span>
                      </div>

                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="flex items-center gap-1 text-rose-500 font-bold">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> Header (Algoritmo)
                        </span>
                        <span className="flex items-center gap-1 text-indigo-500 font-bold">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Payload (Claims & Rol)
                        </span>
                        <span className="flex items-center gap-1 text-emerald-500 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Firma HMAC-SHA256
                        </span>
                      </div>

                      {/* Botón de validación en vivo contra GET /auth/me */}
                      <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Validar Token contra Endpoint Protegido (`GET /auth/me`)
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Envía el token en la cabecera `Authorization: Bearer` al JwtAuthGuard de NestJS.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={validateTokenWithBackend}
                          disabled={validatingToken}
                          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          {validatingToken ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Validando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Verificar en NestJS</span>
                            </>
                          )}
                        </button>
                      </div>

                      {validationResult && (
                        <div className={`p-3 rounded-xl border text-xs ${
                          validationResult.valid 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                        }`}>
                          <div className="font-bold flex items-center gap-1.5">
                            {validationResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                            {validationResult.valid ? 'Token validado exitosamente por NestJS (200 OK)' : 'Aviso de validación de token'}
                          </div>
                          {validationResult.valid ? (
                            <p className="text-[11px] mt-1 font-mono">
                              Claims devueltos por el servidor: {JSON.stringify(validationResult.claims)}
                            </p>
                          ) : (
                            <p className="text-[11px] mt-1 opacity-90">{validationResult.error}</p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                            <Code2 className="w-4 h-4 text-indigo-500" />
                            Claims Decodificados
                          </div>
                          <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            {JSON.stringify(parsedToken?.payload, null, 2)}
                          </pre>
                        </div>

                        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Detalles de la integración
                          </div>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            • <strong>Único Token:</strong> Se emite un único JWT que centraliza autenticación y autorización.
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            • <strong>User ID:</strong> {parsedToken?.payload?.userId || parsedToken?.payload?.sub}
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            • <strong>Rol del usuario:</strong> {parsedToken?.payload?.role} (evaluado por NestJS Guards).
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            • <strong>Expiración:</strong> {parsedToken?.payload?.exp ? new Date(parsedToken.payload.exp * 1000).toLocaleString() : 'N/A'}.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      Inicia sesión en el formulario principal para ver aquí el token JWT generado en tiempo real.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: COOKIES */}
              {techTab === 'cookie' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Ciclo de Cookies de Sesión (NestJS + Navegador)
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      cookieInfo?.isOpen
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    }`}>
                      {cookieInfo?.isOpen ? '● Cookie ABIERTA (Activa)' : '○ Cookie CERRADA (Revocada)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                        <Cookie className="w-4 h-4 text-amber-500" />
                        Directivas de Seguridad
                      </h4>
                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500">Cookie:</span>
                          <span className="font-bold">access_token</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500">HttpOnly:</span>
                          <span className="text-emerald-600 font-bold">true (Inaccesible vía JS)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500">Secure:</span>
                          <span className="text-emerald-600 font-bold">true (Solo HTTPS)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-500">SameSite:</span>
                          <span className="text-emerald-600 font-bold">Strict (Anti-CSRF)</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">Explicación del Ciclo</h4>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                          <strong>Apertura:</strong> Al hacer login, NestJS devuelve la cabecera <code className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded">Set-Cookie: access_token=...</code>.
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                          <strong>Cierre:</strong> Al pulsar cerrar sesión, NestJS envía <code className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded">Max-Age=0</code> para ordenar al navegador su destrucción inmediata.
                        </p>
                      </div>

                      {isAuthenticated && (
                        <button
                          type="button"
                          onClick={logout}
                          className="mt-3 w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Simular Cierre de Cookie Ahora
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: NESTJS */}
              {techTab === 'nest' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                        <Server className="w-4 h-4 text-emerald-500" />
                        Endpoints en NestJS (`AuthController.ts`)
                      </div>
                      <pre className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
{`// 1. Emisión de Token JWT
@Post('token')
async createToken(@Body() { userId }: CreateTokenDto) {
  return {
    accessToken: await this.auth.createToken(userId),
  };
}

// 2. Validación de Token con Guard
@Get('me')
@UseGuards(JwtAuthGuard)
me(@CurrentUser() user: TokenPayload): TokenPayload {
  return user; // Retorna { userId, username, role }
}`}
                      </pre>
                    </div>

                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-500" />
                        Admin Seed y Roles PostgreSQL
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                        Usuario sembrado en `backend/src/dev-seed/dev-seed.service.ts`:
                      </p>
                      <ul className="space-y-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        <li>• id: <code>3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c</code></li>
                        <li>• username: <code>admin</code></li>
                        <li>• password: <code>admin</code> (bcrypt)</li>
                        <li>• role: <code>admin</code></li>
                      </ul>
                      <div className="mt-3 p-2 bg-zinc-100 dark:bg-zinc-800/80 rounded border border-zinc-200 dark:border-zinc-700 text-[11px]">
                        <strong>Real-first:</strong> El frontend solicita el token a NestJS en el puerto 3000/4000 a través del proxy `/api`. Si el backend está activo, entrega el JWT oficial firmado.
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Pie del modal */}
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTechModal(false)}
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Cerrar Consola
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
