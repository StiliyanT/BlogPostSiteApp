/// <reference types="vite/client" />
import { API_BASE } from './urls';
import { authHeaders } from '../hooks/useAuth';

export type BlogPostListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  createdOn: string;
  modifiedOn: string;
  status?: number; // 0 draft, 1 published
  likes?: number;
  views?: number;
};

export type BlogPostDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  createdOn: string;
  modifiedOn: string;
  status: number;        // 0 Draft, 1 Published, 2 Archived (if you surface it)
  mdx: string;           // raw MDX from API
  heroImageUrl?: string | null;
  heroUrl?: string | null;
  views?: number;
  likes?: number;
  author?: { id: string; name: string; slug?: string | null; avatar?: string | null } | null;
  category?: { id: string; name: string; slug?: string | null } | null;
};

export async function getPosts(): Promise<BlogPostListItem[]> {
  const res = await fetch(`${API_BASE}/api/blogposts`);
  if (!res.ok) throw new Error('Failed to load posts');
  const text = await res.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch { throw new Error('Invalid JSON from posts endpoint'); }
}

export async function getPostBySlug(slug: string): Promise<BlogPostDetail> {
  const res = await fetch(`${API_BASE}/api/blogposts/slug/${encodeURIComponent(slug)}`);
  if (res.status === 404) throw new Error('not-found');
  if (!res.ok) throw new Error('Failed to load post');
  const txt = await res.text();
  if (!txt) throw new Error('Empty response for post');
  try { return JSON.parse(txt); } catch { throw new Error('Invalid JSON for post'); }
}

export async function likePost(slug: string): Promise<number | null> {
  const res = await fetch(`${API_BASE}/api/blogposts/slug/${encodeURIComponent(slug)}/like`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to like');
  try {
    const data = await res.json();
    return typeof data?.likes === 'number' ? data.likes : null;
  } catch {
    return null;
  }
}

export async function toggleLike(slug: string, token?: string | null): Promise<number | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const ah = authHeaders(token) as Record<string, string> | undefined;
  if (ah) Object.assign(headers, ah);
  const res = await fetch(`${API_BASE}/api/blogposts/slug/${encodeURIComponent(slug)}/like`, {
    method: 'POST',
    headers,
  });
  if (res.status === 403 || res.status === 401) throw new Error('auth-required');
  if (!res.ok) throw new Error('Failed to toggle like');
  try { const data = await res.json(); return typeof data?.likes === 'number' ? data.likes : null; } catch { return null; }
}

export async function getLikedPosts(token?: string | null): Promise<BlogPostListItem[]> {
  const headers2: Record<string, string> = {};
  const ah2 = authHeaders(token) as Record<string, string> | undefined;
  if (ah2) Object.assign(headers2, ah2);
  const res = await fetch(`${API_BASE}/api/blogposts/liked`, { headers: headers2 });
  if (res.status === 401 || res.status === 403) throw new Error('auth-required');
  if (!res.ok) throw new Error('Failed to get liked posts');
  const txt = await res.text();
  if (!txt) return [];
  try { return JSON.parse(txt); } catch { throw new Error('Invalid JSON from liked posts'); }
}

export function trackPostView(slug: string): void {
  const url = `${API_BASE}/api/blogposts/slug/${encodeURIComponent(slug)}/view`;
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([''], { type: 'text/plain' });
      navigator.sendBeacon(url, blob);
      return;
    }
  } catch {
    // ignore and fall back to fetch
  }
  // Fallback (non-blocking, tries to persist on unload)
  try {
    void fetch(url, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: '' });
  } catch {
    // swallow
  }
}

// Client-side click tracker for Spotlight cards.
// Prevents duplicate views within a time window using localStorage and sends the view via sendBeacon/fetch.
export function trackClickView(slug: string, windowMs = 6 * 60 * 60 * 1000): void {
  try {
    if (!slug) return;
    const key = `viewed:${slug}`;
    const now = Date.now();
    const last = Number(localStorage.getItem(key) || 0);
    if (last && now - last <= windowMs) return; // already counted recently
    // mark immediately to avoid duplicate sends on rapid clicks
    try { localStorage.setItem(key, String(now)); } catch {}
    const url = `${API_BASE}/api/blogposts/slug/${encodeURIComponent(slug)}/view`;
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([''], { type: 'text/plain' });
        navigator.sendBeacon(url, blob);
        return;
      }
    } catch {
      // ignore
    }
    // fallback to non-blocking fetch with keepalive where available
    try { void fetch(url, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: '' }); } catch {}
  } catch {
    // swallow any errors — tracking must not break navigation
  }
}

// Admin-protected APIs
export async function publishPost(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/blogposts/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to publish');
}

export async function deletePost(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/blogposts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete');
}

export async function uploadPostZip(params: { file: File; slug?: string; authorId?: string; categoryId?: string; token: string }): Promise<any> {
  const { file, slug, token, authorId, categoryId } = params as any;
  const fd = new FormData();
  fd.append('file', file);
  if (slug) fd.append('slug', slug);
  if (authorId) fd.append('authorId', authorId);
  if (categoryId) fd.append('categoryId', categoryId);
  const res = await fetch(`${API_BASE}/api/admin/blogposts/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error('Failed to upload zip');
  const body = await res.text();
  if (!body) return {};
  try { return JSON.parse(body); } catch { return {}; }
}

export async function getAuthors(): Promise<{ id: string; name: string; slug?: string; avatar?: string }[]> {
  const res = await fetch(`${API_BASE}/api/authors`);
  if (!res.ok) throw new Error('Failed to load authors');
  const txt = await res.text();
  if (!txt) return [];
  try { return JSON.parse(txt); } catch { throw new Error('Invalid JSON from authors endpoint'); }
}

// Contact form API
export type ContactMessageInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  // Optional anti-abuse signals
  honeypot?: string;
  elapsedMs?: number;
};

export async function sendContactMessage(input: ContactMessageInput): Promise<void> {
  const res = await fetch(`${API_BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let msg = 'Failed to send message';
    try {
      const data = await res.json();
      if (typeof data?.error === 'string') msg = data.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

export async function getCategories(): Promise<{ id: string; name: string; slug?: string }[]> {
  const res = await fetch(`${API_BASE}/api/categories`);
  if (!res.ok) throw new Error('Failed to load categories');
  const txt = await res.text();
  if (!txt) return [];
  try { return JSON.parse(txt); } catch { throw new Error('Invalid JSON from categories endpoint'); }
}

export async function createCategory(name: string, token: string): Promise<{ id: string; name: string; slug?: string }>{
  const res = await fetch(`${API_BASE}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create category');

  // Try to parse JSON body; some servers may return 201 Created with empty body.
  try {
    const txt = await res.text();
    if (txt && txt.trim().length > 0) {
      try { return JSON.parse(txt); } catch { /* fallthrough to fallback */ }
    }
  } catch {
    // ignore and proceed to fallback
  }

  // If no JSON body, try to resolve from Location header
  const loc = res.headers.get('Location') || res.headers.get('location');
  if (loc) {
    try {
      const r2 = await fetch(loc, { headers: { Authorization: `Bearer ${token}` } });
      if (r2.ok) {
        const txt2 = await r2.text();
        if (txt2 && txt2.trim().length > 0) {
          try { return JSON.parse(txt2); } catch { /* fallthrough */ }
        }
      }
    } catch { /* ignore */ }
  }

  // Fallback: refresh full categories list and find by name (case-insensitive)
  try {
    const all = await getCategories();
    const found = all.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
    if (found) return found;
  } catch {
    // ignore
  }

  throw new Error('Invalid JSON from create category');
}