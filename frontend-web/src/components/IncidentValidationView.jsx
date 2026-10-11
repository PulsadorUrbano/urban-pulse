import { useState, useEffect } from 'react';
import { useIncidentValidation } from '../hooks/useIncidentValidation';
import { MapPin, Maximize2, X, Moon, Sun, CheckCircle2, XCircle, Info, LogOut, ChevronDown, ShieldCheck, AlertTriangle } from 'lucide-react';

export const IncidentValidationView = ({ incidentId = 'INC-2026-8942', onNavigateToLogin }) => {
  const {
    incident,
    loading,
    error,
    decision,
    handleDecisionSelect,
    selectedPriority,
    setSelectedPriority,
    rejectReason,
    setRejectReason,
    justification,
    setJustification,
    handleSubmit,
    submitting,
    submitSuccess,
    reset
  } = useIncidentValidation(incidentId);

  // Mapeo para el slider de prioridad
  const priorityToValue = { 'Baja': 0, 'Media': 1, 'Alta': 2 };
  const valueToPriority = { 0: 'Baja', 1: 'Media', 2: 'Alta' };

  // Estado del tema oscuro. Por defecto false (Modo Claro)
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Estados para el flujo de Cierre de Sesión (Mockup)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // EFECTO CRÍTICO: Añade o quita la clase 'dark' a la etiqueta <html> global
  // Esto garantiza que Tailwind detecte el modo oscuro correctamente en cualquier navegador.
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <CheckCircle2 className="w-16 h-16 text-zinc-900 dark:text-zinc-100 mb-4" />
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Auditoría Aprobada</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">El registro cumple normativa institucional.</p>
        <button 
          onClick={reset}
          className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold rounded-lg shadow-md transition-all"
        >
          Siguiente Expediente
        </button>
      </div>
    );
  }

  if (!incident) return <div className="p-8 text-zinc-900 dark:text-zinc-100 font-bold">Error crítico de red.</div>;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans">
      
      {/* CABECERA INSTITUCIONAL */}
      <header className="h-16 flex justify-between items-center px-6 border-b border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-sm flex items-center justify-center">
            <span className="text-white dark:text-zinc-900 font-black text-sm">M</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-zinc-900 dark:text-zinc-100 tracking-tight">Pulsador Urbano</h1>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Ayuntamiento de Málaga</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {/* PERFIL DE USUARIO CON MENÚ DESPLEGABLE INSTITUCIONAL */}
          <div className="relative pl-6 border-l border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
              title="Menú de perfil institucional"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs">
                AS
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Alejandro Sánchez</div>
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Gestión de Infraestructuras</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* MENÚ DESPLEGABLE INSTITUCIONAL */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Alejandro Sánchez</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">alejandro.sanchez@malaga.es</p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Cookie HttpOnly Activa</span>
                  </div>
                </div>

                <div className="py-1">
                  <div className="px-4 py-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Rol: <span className="font-semibold text-zinc-800 dark:text-zinc-200">administrative</span>
                  </div>
                  <div className="px-4 py-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Plataforma: <span className="font-semibold text-zinc-800 dark:text-zinc-200">Urban Pulse Web</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar sesión municipal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 min-h-0 flex gap-6 p-6">
        
        {/* COLUMNA IZQUIERDA: EXPEDIENTE */}
        <section className="flex-[5.5] flex flex-col gap-6 min-h-0 overflow-y-auto hide-scroll">
          
          <div className="grid grid-cols-3 gap-4 shrink-0">
            <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-zinc-400" />
                {/* Título agrandado a text-sm para mejor lectura */}
                <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Expediente</h3>
              </div>
              <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">{incident.id}</p>
            </div>
            
            <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
              {/* Título agrandado */}
              <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Categoría</h3>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{incident.category}</p>
            </div>
            
            <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col justify-between">
              <div>
                {/* Título agrandado */}
                <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Ubicación</h3>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">{incident.location.address}</p>
              </div>
              <a 
                href={`https://maps.google.com/?q=${incident.location.coordinates}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mt-2 transition-colors"
              >
                <MapPin className="w-4 h-4" /> Abrir Mapa
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col overflow-hidden shrink-0">
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/60 flex justify-between items-center">
              {/* Título agrandado */}
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Evidencia Fotográfica</h3>
              <button 
                onClick={() => setIsZoomed(true)}
                className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-50 dark:bg-zinc-800 px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <Maximize2 className="w-4 h-4" /> Agrandar
              </button>
            </div>
            <div className="relative bg-zinc-100 dark:bg-black h-64 md:h-80 w-full p-2">
              <img 
                src={incident.evidenceUrl} 
                alt="Evidencia" 
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm shrink-0">
            {/* Título agrandado */}
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 mb-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
              Descripción del Ciudadano
            </h3>
            <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
              {incident.description}
            </p>
          </div>

        </section>

        {/* COLUMNA DERECHA: AUDITORÍA */}
        <section className="flex-[4.5] flex flex-col gap-6 min-h-0 overflow-y-auto hide-scroll">
          
          <div className="p-6 rounded-xl border bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/60 shadow-sm shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                Análisis Automático
              </h3>
              {/* Precisión agrandada a text-sm */}
              <span className="text-sm font-mono bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-inner">
                Precisión: {incident.aiSuggestion.confidence}%
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-base font-bold text-zinc-600 dark:text-zinc-400">Nivel de Alerta:</span>
              {/* Eliminados los logotipos de peligro */}
              <span className="text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                {incident.aiSuggestion.priority}
              </span>
            </div>
            <p className="text-base leading-relaxed italic text-zinc-700 dark:text-zinc-300">
              "{incident.aiSuggestion.reasoning}"
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col shrink-0 mb-6 relative overflow-hidden">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Resolución Técnica</h3>
            </div>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => handleDecisionSelect('validate')}
                className={`flex-1 py-4 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all duration-300 border-2 ${
                  decision === 'validate'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-md scale-[1.02]'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Proceder
              </button>
              
              <button
                onClick={() => handleDecisionSelect('reject')}
                className={`flex-1 py-4 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all duration-300 border-2 ${
                  decision === 'reject'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-md scale-[1.02]'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <XCircle className="w-5 h-5" />
                Descartar
              </button>
            </div>

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${decision ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
              
              {decision === 'validate' && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                      Nivel de Actuación
                    </label>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">{selectedPriority}</span>
                  </div>
                  
                  <div className="px-2">
                    <input 
                      type="range" 
                      min="0" max="2" step="1"
                      value={priorityToValue[selectedPriority] ?? 1}
                      onChange={(e) => setSelectedPriority(valueToPriority[e.target.value])}
                      className="premium-slider"
                    />
                    <div className="flex justify-between text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-3 px-1">
                      <span>Baja</span>
                      <span>Media</span>
                      <span>Alta</span>
                    </div>
                  </div>
                </div>
              )}

              {decision === 'reject' && (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4">
                    Causa del Descarte
                  </label>
                  <div className="flex flex-col gap-3">
                    {['Improcedente', 'Duplicado', 'Fuera de competencia'].map(r => (
                      <button
                        key={r}
                        onClick={() => setRejectReason(r)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${
                          rejectReason === r
                            ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          rejectReason === r 
                            ? 'border-zinc-900 dark:border-white' 
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}>
                          {rejectReason === r && <div className="w-2.5 h-2.5 bg-zinc-900 dark:bg-white rounded-full" />}
                        </div>
                        <span className={`text-sm font-bold ${rejectReason === r ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          {r}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col mt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                    Justificación Técnica
                  </label>
                </div>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Describa el motivo de la resolución de forma objetiva..."
                  className="w-full min-h-[140px] p-4 rounded-xl text-base font-medium leading-relaxed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors resize-none hide-scroll"
                />
                
                {error && (
                  <div className="mt-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 bg-zinc-200 dark:bg-zinc-800 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !decision}
                  className={`mt-6 w-full py-4 rounded-xl text-base font-black uppercase tracking-widest shadow-lg transition-all duration-300 shrink-0 ${
                    submitting || !decision
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                      : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-[1.01] hover:shadow-xl'
                  }`}
                >
                  {submitting ? 'Procesando...' : 'Confirmar Resolución'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL ZOOM DE IMAGEN */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col">
          <div className="flex justify-end p-6">
            <button 
              onClick={() => setIsZoomed(false)}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-transform hover:scale-110"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 p-4 md:p-12 overflow-hidden flex items-center justify-center">
             <img 
               src={incident.evidenceUrl} 
               alt="Evidencia Ampliada" 
               className="w-full h-full object-contain drop-shadow-2xl"
             />
          </div>
        </div>
      )}

      {/* MODAL INSTITUCIONAL DE CONFIRMACIÓN DE CIERRE DE SESIÓN */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  ¿Cerrar sesión en Pulsador Urbano?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Se revocará el token JWT activo y se ordenará la expiración inmediata de la cookie de sesión (<code className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">access_token</code>, <code className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">Max-Age=0</code>).
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Cualquier validación no guardada en el expediente actual se cancelará.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Permanecer en la sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  if (onNavigateToLogin) onNavigateToLogin();
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirmar y cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
