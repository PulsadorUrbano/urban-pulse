import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Code2,
  Database,
  HardDrive,
  Key,
  LogOut,
  RefreshCw,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import type { useAuth } from '../hooks/use-auth';
import { decodeToken } from '../services/token.service';

interface TechnicalConsoleProps {
  auth: ReturnType<typeof useAuth>;
  onClose: () => void;
}

// Consola de demostración: inspección del token, sesión del navegador y endpoints.
export function TechnicalConsole({ auth, onClose }: TechnicalConsoleProps) {
  const { token, session, isAuthenticated, validatingToken, validationResult, logout, validateTokenWithBackend } = auth;
  const [techTab, setTechTab] = useState<'jwt' | 'session' | 'nest'>('jwt');

  const isBackendToken = token?.source === 'backend';
  const accessToken = token?.accessToken ?? null;
  const parsedToken = accessToken ? decodeToken(accessToken) : null;
  const sessionInfo = session?.session ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal header */}
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
                Inspección del token, validación contra NestJS y almacenamiento de la sesión
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical tab selector */}
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
            onClick={() => setTechTab('session')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              techTab === 'session'
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Sesión en el navegador
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

        {/* Tab content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          
          {/* TAB 1: JWT TOKEN */}
          {techTab === 'jwt' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {isBackendToken ? 'Token JWT emitido por el backend' : 'Token simulado (no es un JWT firmado)'}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isBackendToken
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                  }`}>
                    {isBackendToken ? '● Origen: Backend NestJS (Real)' : '○ Origen: Datos simulados (mock)'}
                  </span>
                </div>
              </div>

              {accessToken ? (
                <>
                  <div className="p-3 bg-zinc-900 dark:bg-black rounded-xl border border-zinc-800 text-xs font-mono break-all leading-relaxed">
                    <span className="text-rose-400 font-semibold">{accessToken.split('.')[0]}</span>
                    <span className="text-white">.</span>
                    <span className="text-indigo-400 font-semibold">{accessToken.split('.')[1]}</span>
                    <span className="text-white">.</span>
                    <span className="text-emerald-400 font-semibold">{accessToken.split('.')[2]}</span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1 text-rose-500 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> {isBackendToken ? 'Header (Algoritmo)' : 'Prefijo mock'}
                    </span>
                    <span className="flex items-center gap-1 text-indigo-500 font-bold">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Payload (Claims & Rol)
                    </span>
                    <span className="flex items-center gap-1 text-emerald-500 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {isBackendToken ? 'Firma HMAC-SHA256 del backend' : 'Sin firma'}
                    </span>
                  </div>

                  {/* Real-time verification button against GET /auth/me */}
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
                        • <strong>Único Token:</strong> {isBackendToken
                          ? 'JWT emitido por POST /auth/login; se envía como Bearer al backend.'
                          : 'Token generado en el navegador para trabajar sin backend; el backend lo rechazaría.'}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        • <strong>User ID:</strong> {parsedToken?.payload?.userId || parsedToken?.payload?.sub}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        • <strong>Rol del usuario:</strong> {parsedToken?.payload?.role} (solo el personal municipal accede a la web).
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

          {/* TAB 2: SESIÓN EN EL NAVEGADOR */}
          {techTab === 'session' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Sesión guardada en el navegador
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isAuthenticated
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}>
                  {isAuthenticated ? '● Sesión ACTIVA' : '○ Sin sesión'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-amber-500" />
                    Almacenamiento
                  </h4>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Clave:</span>
                      <span className="font-bold">urban_pulse_session_meta</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Dónde:</span>
                      <span className="font-bold">{sessionInfo?.storage ?? '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Caduca:</span>
                      <span className="font-bold">
                        {sessionInfo?.expiresAt ? new Date(sessionInfo.expiresAt).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Envío al backend:</span>
                      <span className="font-bold">Authorization: Bearer</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">Ciclo de la sesión</h4>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                      <strong>Apertura:</strong> el token se guarda en <code className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded">localStorage</code> con «Mantener sesión iniciada» o en <code className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded">sessionStorage</code> si no, y se envía en la cabecera <code className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded">Authorization</code>. El backend no usa cookies.
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      <strong>Cierre:</strong> al cerrar sesión se borra del navegador. Al recargar, un token del backend se revalida con <code className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded">GET /auth/me</code>.
                    </p>
                  </div>

                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={logout}
                      className="mt-3 w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Cerrar sesión ahora
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
{`// 1. Inicio de sesión: devuelve el JWT
@Post('login')
@HttpCode(200)
login(@Body(new LoginPipe()) input: LoginDto) {
  // { usernameOrEmail, password } -> { accessToken }
}

// 2. Sesión actual con Guard
@Get('me')
@UseGuards(JwtAuthGuard)
me(@CurrentUser() user: TokenPayload) {
  // -> { userId, username, email, role, phone }
}`}
                  </pre>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-500" />
                    Admin Seed y Roles PostgreSQL
                  </div>
                  {import.meta.env.DEV && (
                    <>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                        Usuario sembrado en `backend/src/dev-seed/dev-seed.service.ts`:
                      </p>
                      <ul className="space-y-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        <li>• id: <code>3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c</code></li>
                        <li>• username: <code>admin</code></li>
                        <li>• password: <code>admin</code> (bcrypt)</li>
                        <li>• role: <code>admin</code></li>
                      </ul>
                    </>
                  )}
                  <div className="mt-3 p-2 bg-zinc-100 dark:bg-zinc-800/80 rounded border border-zinc-200 dark:border-zinc-700 text-[11px] space-y-1">
                    <p>
                      <strong>Origen de la sesión:</strong> {!isAuthenticated ? 'sin sesión' : isBackendToken ? 'backend' : 'datos simulados (sin conexión)'}.
                    </p>
                    <p>
                      Las peticiones van a <code>VITE_BACKEND_URL</code> (por defecto <code>/api</code>, que el proxy de Vite o nginx redirige al backend). Si el backend no responde, en desarrollo el login usa los datos simulados y lo indica con un aviso; en producción muestra un error. Las incidencias siempre se leen del backend.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Cerrar Consola
          </button>
        </div>

      </div>
    </div>
  );
}
