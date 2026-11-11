import { useState } from 'react';
import { ChevronDown, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';

import type { SessionUser } from '../types/user';
import { displayName } from '../utils/display-name';

interface AppHeaderProps {
  user: SessionUser;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onRequestLogout: () => void;
}

function initialsOf(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AppHeader({ user, isDarkMode, onToggleTheme, onRequestLogout }: AppHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userName = displayName(user);
  const userSubtitle = user.source === 'mock' ? (user.departmentName ?? user.role) : user.role;

  return (
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
          type="button"
          onClick={onToggleTheme}
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
              {initialsOf(userName)}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{userName}</div>
              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{userSubtitle}</div>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* MENÚ DESPLEGABLE INSTITUCIONAL */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in duration-150">
              <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{userName}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{user.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>{user.source === 'backend' ? 'Sesión del backend' : 'Sesión simulada (sin conexión)'}</span>
                </div>
              </div>

              <div className="py-1">
                <div className="px-4 py-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Rol: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.role}</span>
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
                    onRequestLogout();
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
  );
}
