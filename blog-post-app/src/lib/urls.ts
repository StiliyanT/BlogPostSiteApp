// Support both VITE_API_BASE (existing) and VITE_API_URL (deployment guide)
const rawBase = (import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? '').toString();
export const API_BASE = rawBase.replace(/\/+$/, '');

if (import.meta.env.PROD && !API_BASE) {
  // Helpful diagnostic in production build if API base URL wasn't injected at build time.
  // Without this, calls go to relative /api/* which Azure Static Web Apps reserves for Functions,
  // resulting in 404/405 instead of reaching the App Service backend.
  // eslint-disable-next-line no-console
  console.warn('[Lumora] API_BASE missing. Set VITE_API_BASE at build (GitHub secret/API_BASE_URL) so frontend targets your App Service API.');
}

export function toAbsolute(url: string) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const path = `/${url.replace(/^\/+/, '')}`; // ensure exactly one leading slash
  return `${API_BASE}${path}`; // if API_BASE is '', this becomes '/static/...' and Vite proxy will forward in dev
}