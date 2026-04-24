const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/$/, '');

const ensureApiPath = (baseUrl: string): string => {
  const normalized = normalizeBaseUrl(baseUrl);

  if (normalized.endsWith('/api')) {
    return normalized;
  }

  return `${normalized}/api`;
};

export const resolveApiBaseUrl = (): string => {
  const desktopApiBaseUrl = window.desktopRuntimeConfig?.apiBaseUrl;

  if (desktopApiBaseUrl && desktopApiBaseUrl.trim().length > 0) {
    return ensureApiPath(desktopApiBaseUrl);
  }

  const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (envApiBaseUrl && envApiBaseUrl.trim().length > 0) {
    return ensureApiPath(envApiBaseUrl);
  }

  return '/api';
};

const API_REQUEST_PREFIX = '/api';

const shouldRewriteRequest = (input: RequestInfo | URL): input is string => {
  if (typeof input !== 'string') {
    return false;
  }

  return input.startsWith(API_REQUEST_PREFIX);
};

export const installApiFetchRewrite = (): void => {
  const apiBaseUrl = resolveApiBaseUrl();
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!shouldRewriteRequest(input) || apiBaseUrl === API_REQUEST_PREFIX) {
      return originalFetch(input, init);
    }

    return originalFetch(`${apiBaseUrl}${input.slice(API_REQUEST_PREFIX.length)}`, init);
  };
};
