import { makeStyles, Spinner } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import SpotlightCard from "../components/SpotlightCard";
import BlogFilters from "../components/BlogFilters";
import type { Filters as BlogFiltersType } from "../components/BlogFilters";
import { getPosts, getPostBySlug, trackClickView } from "../lib/apis";
import type { BlogPostListItem } from "../lib/apis";
import { toAbsolute } from "../lib/urls";

const useStyles = makeStyles({
  root: {
    width: "100vw",
    minHeight: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f3f4f6 0%, #e0e7ef 100%)",
    '@media (prefers-color-scheme: dark)': {
      background: "linear-gradient(135deg, #171717 0%, #262626 100%)",
    },
    paddingTop: '2rem',
    paddingBottom: '6rem', // space for fixed pagination bar
  },
  content: {
    width: '100%',
    maxWidth: '1200px',
    padding: '0 1rem',
    margin: '0 auto',
    display: 'grid',
    gridTemplateRows: 'auto 1fr', // title | content (pagination is fixed)
    minHeight: 'calc(100vh - 8rem)',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: 600,
    marginBottom: '2rem',
    marginTop: '4rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '2rem',
    width: '100%',
    alignItems: 'start',
    justifyItems: 'stretch',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    '@media (max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
  muted: {
    opacity: 0.75,
    fontSize: '1.05rem',
  },
  // Fixed pagination bar anchored to bottom of viewport
  paginationBar: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'saturate(180%) blur(8px)',
    WebkitBackdropFilter: 'saturate(180%) blur(8px)',
    borderTop: '1px solid #cbd5e1',
    '@media (prefers-color-scheme: dark)': {
      background: 'rgba(23,23,23,0.85)',
      borderTop: '1px solid #404040',
    },
    zIndex: 5,
  },
  paginationInner: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0.75rem 1rem',
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageInfo: {
    margin: '0 0.5rem',
    opacity: 0.8,
    fontSize: '0.95rem',
  },
  pageButton: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
    '&:hover': { backgroundColor: '#f8fafc' },
    '&:disabled': { opacity: 0.5, cursor: 'default' },
  },
  // New: default style for numbered page buttons (non-selected)
  pageNumberButton: {
    backgroundColor: '#f1f5f9', // slate-100
    '&:hover': { backgroundColor: '#e2e8f0' },
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#262626',
      color: '#e5e7eb',
      border: '1px solid #404040',
    },
  },
  // Selected numbered page button style
  pageButtonActive: {
    backgroundColor: '#e2e8f0', // gray-200 instead of white
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    boxShadow: '0 0 0 1px #ffffff', // thinner white outline
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#404040', // dark gray for dark mode
      color: '#e5e7eb',
      border: '1px solid #404040',
      boxShadow: '0 0 0 1px #ffffff', // keep white outline in dark mode
    },
  },
  // New: ellipsis token style
  pageEllipsis: {
    padding: '0.5rem 0.75rem',
    color: '#64748b',
    '@media (prefers-color-scheme: dark)': {
      color: '#9ca3af',
    },
    userSelect: 'none',
  },
  loadingRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '120px',
  },
  loadingScreen: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 8rem)', // match content area height
    width: '100%',
    
  },
  loadingOverlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.08)',
    backdropFilter: 'saturate(180%) blur(6px)',
    WebkitBackdropFilter: 'saturate(180%) blur(6px)',
    zIndex: 50,
  },
  spinnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    paddingBottom: '2rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.5rem',
    overflow: 'visible',
    minWidth: '260px',
    minHeight: '160px',
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#171717',
      border: '1px solid #404040',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    },
  },
  spinner: {
    display: 'block',
    marginBottom: '0.75rem',
  },
  spinnerLabel: {
    marginTop: '0.25rem',
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.4,
    color: '#111827',
    '@media (prefers-color-scheme: dark)': {
      color: '#e5e7eb',
    },
  },
});

type SpotlightItem = {
  slug: string;
  title: string;
  image?: string;
  author?: string;
  views?: number;
  likes?: number;
  createdOn?: string;
};

function normalizeHeroUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const s = String(url);
  if (/^(https?:)?\/\//i.test(s) || s.startsWith('data:')) return s; // absolute or data URL
  // Treat anything else as API-relative path, e.g. "/static/posts/..."
  return toAbsolute(s);
}

const PAGE_SIZE = 6;

function buildPageItems(totalPages: number, currentPage: number): Array<number | 'ellipsis'> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const s = new Set<number>();
  s.add(1);
  s.add(totalPages);
  s.add(currentPage);
  if (currentPage - 1 >= 1) s.add(currentPage - 1);
  if (currentPage + 1 <= totalPages) s.add(currentPage + 1);
  const pages = Array.from(s).sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];
  for (let i = 0; i < pages.length; i++) {
    if (i === 0) {
      result.push(pages[i]);
    } else {
      if (pages[i] - pages[i - 1] === 1) {
        result.push(pages[i]);
      } else {
        result.push('ellipsis', pages[i]);
      }
    }
  }
  return result;
}

export default function Blogs() {
  const styles = useStyles();
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<BlogFiltersType>({ query: '', author: undefined, sort: 'newest' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await getPosts();
        console.log('Loaded posts list', list);
        const detailed = await Promise.all(
          list.map(async (p: BlogPostListItem): Promise<SpotlightItem> => {
            try {
              const detail = await getPostBySlug(p.slug);
              console.log('Loaded post detail', p.slug, detail);
              return {
                slug: p.slug,
                title: p.title,
                image: normalizeHeroUrl((detail as any).heroUrl),
                // detail.author used to be a string; after API changes it's an object { id, name, slug, avatar }
                // normalize to the author's display name so downstream sorting/filtering (which expects strings) works
                author: (detail as any).author?.name ?? (typeof (detail as any).author === 'string' ? (detail as any).author : 'Unknown'),
                views: (detail as any).views ?? 0,
                likes: (detail as any).likes ?? 0,
                createdOn: p.createdOn,
              };
            } catch (e) {
              console.warn('Failed to load post detail', p.slug, e);
              return { slug: p.slug, title: p.title };
            }
          })
        );
        if (!cancelled) setItems(detailed);
      } catch (e: any) {
        console.error('Failed to load posts', e);
        if (!cancelled) setError(e?.message || 'Failed to load posts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset to first page when the data set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  // derive author list for filter dropdown
  const authors = Array.from(new Set(items.map(i => i.author).filter(Boolean) as string[]));

  // apply filters & sorting
  const filtered = items.filter(it => {
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const hay = `${it.title || ''} ${it.author || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.author != null && filters.author !== '') {
      if ((it.author || '').toLowerCase() !== (filters.author || '').toLowerCase()) return false;
    }
    return true;
  }).sort((a, b) => {
    switch (filters.sort) {
      case 'views': return (b.views || 0) - (a.views || 0);
      case 'likes': return (b.likes || 0) - (a.likes || 0);
      case 'alpha': return (a.title || '').localeCompare(b.title || '');
      default: // newest
        return new Date(b.createdOn || '').getTime() - new Date(a.createdOn || '').getTime();
    }
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const numberedItems = buildPageItems(totalPages, currentPage);

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <h1 className={styles.title}>All Blog Posts</h1>

        {/* Middle content area */}
        <div>
          <BlogFilters authors={authors} value={filters} onChange={(v: BlogFiltersType) => { setFilters(v); setCurrentPage(1); }} />
          {error && !loading && <div className={styles.muted}>Error: {error}</div>}

          {!loading && !error && pageItems.length === 0 && (
            <div className={styles.muted}>No posts found.</div>
          )}

          {!loading && !error && pageItems.length > 0 && (
            <div className={styles.grid}>
              {pageItems.map((post) => (
                <SpotlightCard
                  key={post.slug}
                  name={post.title || 'Untitled'}
                  image={typeof post.image === 'string' ? post.image : '/placeholder.jpg'}
                  author={post.author || 'Unknown'}
                  views={typeof post.views === 'number' ? post.views : 0}
                  likes={typeof post.likes === 'number' ? post.likes : 0}
                  createdOn={post.createdOn}
                  to={`/blog/${post.slug}`}
                  onClick={() => trackClickView(post.slug)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed pagination bar at the bottom of the viewport */}
      <div className={styles.paginationBar}>
        <div className={styles.paginationInner}>
          <nav className={styles.pagination} aria-label="Pagination">
            <button
              className={`${styles.pageButton} ${styles.pageNumberButton}`}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </button>

            {numberedItems.map((item, idx) =>
              typeof item === 'number' ? (
                <button
                  key={`p-${item}`}
                  className={`${styles.pageButton} ${styles.pageNumberButton} ${item === currentPage ? styles.pageButtonActive : ''}`}
                  onClick={() => setCurrentPage(item)}
                  aria-current={item === currentPage ? 'page' : undefined}
                  disabled={loading}
                >
                  {item}
                </button>
              ) : (
                <span key={`e-${idx}`} className={styles.pageEllipsis} aria-hidden>
                  …
                </span>
              )
            )}

            <button
              className={`${styles.pageButton} ${styles.pageNumberButton}`}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </button>
          </nav>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinnerCard} role="status" aria-live="polite">
            <Spinner size="extra-large" className={styles.spinner} />
            <div className={styles.spinnerLabel}>Loading blog posts…</div>
          </div>
        </div>
      )}
    </div>
  );
}
