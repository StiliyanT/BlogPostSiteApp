/// <reference types="vite/client" />
const API_BASE = import.meta.env.VITE_API_BASE || '';

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
};

export async function getPosts(): Promise<BlogPostListItem[]> {
  const res = await fetch(`${API_BASE}/api/blogposts`);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}

export async function getPostBySlug(slug: string): Promise<BlogPostDetail> {
  const res = await fetch(`${API_BASE}/api/blogposts/slug/${encodeURIComponent(slug)}`);
  if (res.status === 404) throw new Error('not-found');
  if (!res.ok) throw new Error('Failed to load post');
  return res.json();
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

export async function uploadPostZip(params: { file: File; slug?: string; token: string }): Promise<any> {
  const { file, slug, token } = params;
  const fd = new FormData();
  fd.append('file', file);
  if (slug) fd.append('slug', slug);
  const res = await fetch(`${API_BASE}/api/admin/blogposts/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error('Failed to upload zip');
  return res.json();
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