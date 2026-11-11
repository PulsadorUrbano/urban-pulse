import type { ProxyOptions } from 'vite'
import { afterEach, describe, expect, it, vi } from 'vitest'

const originalProxyUrl = process.env.URBAN_PULSE_PROXY_URL

afterEach(() => {
  if (originalProxyUrl === undefined) {
    delete process.env.URBAN_PULSE_PROXY_URL
  } else {
    process.env.URBAN_PULSE_PROXY_URL = originalProxyUrl
  }
  vi.resetModules()
})

async function loadProxyConfig(): Promise<ProxyOptions> {
  vi.resetModules()
  const { default: config } = await import('../../../vite.config')
  const proxy = config.server?.proxy?.['/api']
  if (proxy === undefined || typeof proxy === 'string') {
    throw new Error('vite.config.ts debe definir un proxy /api con opciones')
  }
  return proxy
}

describe('Vite API proxy configuration', () => {
  it('defaults to localhost:3000 when no proxy URL is configured', async () => {
    delete process.env.URBAN_PULSE_PROXY_URL

    const proxy = await loadProxyConfig()

    expect(proxy.target).toBe('http://localhost:3000')
  })

  it('uses the configured backend proxy URL', async () => {
    process.env.URBAN_PULSE_PROXY_URL = 'http://127.0.0.1:49152'

    const proxy = await loadProxyConfig()

    expect(proxy.target).toBe('http://127.0.0.1:49152')
  })

  it('rewrites the API prefix from login requests', async () => {
    const proxy = await loadProxyConfig()

    expect(proxy.rewrite?.('/api/auth/login')).toBe('/auth/login')
  })
})
