// Support both VITE_API_BASE (existing) and VITE_API_URL (deployment guide)
const rawBase = (import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? '').toString();
export const API_BASE = rawBase.replace(/\/+$/, '');

export function toAbsolute(url: string) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const path = `/${url.replace(/^\/+/, '')}`; // ensure exactly one leading slash
  return `${API_BASE}${path}`; // if API_BASE is '', this becomes '/static/...' and Vite proxy will forward in dev
}