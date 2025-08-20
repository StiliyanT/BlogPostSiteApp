export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

export function toAbsolute(url: string) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const path = `/${url.replace(/^\/+/, '')}`; // ensure exactly one leading slash
  return `${API_BASE}${path}`; // if API_BASE is '', this becomes '/static/...' and Vite proxy will forward in dev
}