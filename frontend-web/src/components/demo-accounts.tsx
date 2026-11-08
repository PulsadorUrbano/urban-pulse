import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { DEMO_USERS } from '../hooks/use-auth';
import type { MockUser } from '../types/user';

interface DemoAccountsProps {
  onSelect: (user: MockUser) => void;
}

// Cuentas de prueba para rellenar el login; solo existen en desarrollo.
export function DemoAccounts({ onSelect }: DemoAccountsProps) {
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  if (DEMO_USERS.length === 0) return null;

  const handleSelect = (user: MockUser) => {
    setShowDemoAccounts(false);
    onSelect(user);
  };

  return (
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
          {DEMO_USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between transition-colors"
            >
              <div>
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  {u.fullName}
                  {u.role === 'admin' && (
                    <span
                      className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold uppercase"
                      title="También existe en el backend (dev-seed)"
                    >
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
  );
}
