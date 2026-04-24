import { afterEach, describe, expect, it, vi } from 'vitest';
import { installApiFetchRewrite, resolveApiBaseUrl } from './apiBaseUrl';

const originalDesktopRuntimeConfig = window.desktopRuntimeConfig;
afterEach(() => {
  window.desktopRuntimeConfig = originalDesktopRuntimeConfig;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('resolveApiBaseUrl', () => {
  it('prioritizes desktop preload config when available', () => {
    window.desktopRuntimeConfig = {
      apiBaseUrl: 'http://127.0.0.1:18080',
      isDesktop: true,
    };

    expect(resolveApiBaseUrl()).toBe('http://127.0.0.1:18080/api');
  });

  it('falls back to VITE_API_BASE_URL in browser mode', () => {
    window.desktopRuntimeConfig = undefined;
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:9999');

    expect(resolveApiBaseUrl()).toBe('http://localhost:9999/api');
  });

  it('falls back to relative /api when no config is available', () => {
    window.desktopRuntimeConfig = undefined;
    vi.stubEnv('VITE_API_BASE_URL', undefined);

    expect(resolveApiBaseUrl()).toBe('/api');
  });
});

describe('installApiFetchRewrite', () => {
  it('rewrites relative /api requests to desktop-local api base url', async () => {
    window.desktopRuntimeConfig = {
      apiBaseUrl: 'http://127.0.0.1:8080',
      isDesktop: true,
    };

    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    installApiFetchRewrite();

    await window.fetch('/api/health');

    expect(fetchSpy).toHaveBeenCalledWith('http://127.0.0.1:8080/api/health', undefined);
  });

  it('does not rewrite non-api requests', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    installApiFetchRewrite();

    await window.fetch('/assets/logo.svg');

    expect(fetchSpy).toHaveBeenCalledWith('/assets/logo.svg', undefined);
  });
});
