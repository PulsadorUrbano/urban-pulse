import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, RefreshCw, User as UserIcon } from 'lucide-react';

interface LoginFormProps {
  usernameOrEmail: string;
  password: string;
  loading: boolean;
  onUsernameOrEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (rememberMe: boolean) => void;
}

export function LoginForm({
  usernameOrEmail,
  password,
  loading,
  onUsernameOrEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(rememberMe);
  };

  return (
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
            onChange={(e) => onUsernameOrEmailChange(e.target.value)}
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
            onChange={(e) => onPasswordChange(e.target.value)}
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

      {/* Clean, institutional submit button */}
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
  );
}
