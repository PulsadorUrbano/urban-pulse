/// <reference types="jest" />

// Las constantes de `config.ts` se evalúan al importar el módulo, por lo que cada
// caso carga una instancia fresca con las variables de entorno y el `hostUri` deseados.

interface ConfigModule {
  API_BASE_URL: string;
  BACKEND_API_URL: string;
}

// Configuración simulada de expo-constants. Se muta por caso antes de cargar el módulo.
let mockExpoConfig: { hostUri?: string } | null | undefined;

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

const ENV_VARIABLES_UNDER_TEST = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_BACKEND_URL'] as const;

// Carga una instancia aislada de config.ts para que lea el entorno actual.
function loadConfigModule(): ConfigModule {
  let loadedConfig: ConfigModule | undefined;
  jest.isolateModules(() => {
    loadedConfig = jest.requireActual<ConfigModule>('@/constants/config');
  });
  if (!loadedConfig) {
    throw new Error('No se pudo cargar el módulo de configuración');
  }
  return loadedConfig;
}

describe('config', () => {
  const originalEnvValues: Partial<Record<(typeof ENV_VARIABLES_UNDER_TEST)[number], string>> = {};

  beforeEach(() => {
    for (const variableName of ENV_VARIABLES_UNDER_TEST) {
      originalEnvValues[variableName] = process.env[variableName];
      delete process.env[variableName];
    }
    mockExpoConfig = undefined;
    // El módulo registra la URL de la API en modo desarrollo; se silencia para no ensuciar la salida.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const variableName of ENV_VARIABLES_UNDER_TEST) {
      const originalValue = originalEnvValues[variableName];
      if (originalValue === undefined) {
        delete process.env[variableName];
      } else {
        process.env[variableName] = originalValue;
      }
    }
    jest.restoreAllMocks();
  });

  describe('BACKEND_API_URL', () => {
    it('devuelve EXPO_PUBLIC_BACKEND_URL tal cual cuando está definida', () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = 'https://backend.example.com:9000/api';
      mockExpoConfig = { hostUri: '192.168.1.5:8081' };

      const config = loadConfigModule();

      expect(config.BACKEND_API_URL).toBe('https://backend.example.com:9000/api');
    });

    it('sin EXPO_PUBLIC_BACKEND_URL usa el host de Metro con el puerto 4000 cuando hay hostUri', () => {
      mockExpoConfig = { hostUri: '192.168.1.5:8081' };

      const config = loadConfigModule();

      expect(config.BACKEND_API_URL).toBe('http://192.168.1.5:4000');
    });

    it('sin variable ni hostUri devuelve http://localhost:4000', () => {
      mockExpoConfig = undefined;

      const config = loadConfigModule();

      expect(config.BACKEND_API_URL).toBe('http://localhost:4000');
    });

    it('con expoConfig presente pero sin hostUri devuelve http://localhost:4000', () => {
      mockExpoConfig = {};

      const config = loadConfigModule();

      expect(config.BACKEND_API_URL).toBe('http://localhost:4000');
    });

    it('con expoConfig a null devuelve http://localhost:4000', () => {
      mockExpoConfig = null;

      const config = loadConfigModule();

      expect(config.BACKEND_API_URL).toBe('http://localhost:4000');
    });

    it('con hostUri vacío (cadena vacía) cae en localhost en lugar de construir una URL vacía', () => {
      mockExpoConfig = { hostUri: '' };

      const config = loadConfigModule();

      expect(config.BACKEND_API_URL).toBe('http://localhost:4000');
    });

    it('extrae solo el host de hostUri, descartando el puerto de Metro', () => {
      mockExpoConfig = { hostUri: '10.0.0.7:19000' };

      const config = loadConfigModule();

      expect(config.BACKEND_API_URL).toBe('http://10.0.0.7:4000');
      expect(config.BACKEND_API_URL).not.toContain('19000');
    });

    it('no usa EXPO_PUBLIC_API_URL como fallback del backend', () => {
      process.env.EXPO_PUBLIC_API_URL = 'http://mock.example.com:3001';
      mockExpoConfig = undefined;

      const config = loadConfigModule();

      expect(config.BACKEND_API_URL).toBe('http://localhost:4000');
    });
  });

  describe('API_BASE_URL (regresión)', () => {
    it('devuelve EXPO_PUBLIC_API_URL tal cual cuando está definida', () => {
      process.env.EXPO_PUBLIC_API_URL = 'http://mock.example.com:3001';
      mockExpoConfig = { hostUri: '192.168.1.5:8081' };

      const config = loadConfigModule();

      expect(config.API_BASE_URL).toBe('http://mock.example.com:3001');
    });

    it('sin EXPO_PUBLIC_API_URL pero con hostUri usa el host de Metro con el puerto 3001', () => {
      mockExpoConfig = { hostUri: '192.168.1.5:8081' };

      const config = loadConfigModule();

      expect(config.API_BASE_URL).toBe('http://192.168.1.5:3001');
    });

    it('sin variable ni hostUri devuelve http://localhost:3001', () => {
      mockExpoConfig = undefined;

      const config = loadConfigModule();

      expect(config.API_BASE_URL).toBe('http://localhost:3001');
    });

    it('no usa EXPO_PUBLIC_BACKEND_URL como fallback de la API mock', () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = 'https://backend.example.com:9000';
      mockExpoConfig = undefined;

      const config = loadConfigModule();

      expect(config.API_BASE_URL).toBe('http://localhost:3001');
    });

    it('API_BASE_URL y BACKEND_API_URL apuntan al mismo host pero a puertos distintos', () => {
      mockExpoConfig = { hostUri: '192.168.1.5:8081' };

      const config = loadConfigModule();

      expect(config.API_BASE_URL).toBe('http://192.168.1.5:3001');
      expect(config.BACKEND_API_URL).toBe('http://192.168.1.5:4000');
    });
  });
});
