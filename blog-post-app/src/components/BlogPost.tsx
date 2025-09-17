import React, { useEffect, useState } from 'react';
    import { useParams, Link } from 'react-router-dom';
  import { getPostBySlug, type BlogPostDetail, trackPostView, toggleLike, getLikedPosts } from '../lib/apis';
    import MdxRenderer from '../components/MdxRenderer';
    import { toAbsolute } from '../lib/urls';
    import { makeStyles, Button } from '@fluentui/react-components';
  import { useAuth } from '../hooks/useAuth';

    const useStyles = makeStyles({
      // page background wrapper (keeps previous gradient look)
      root: {
        minHeight: '100vh',
        padding: '2rem 1rem',
        background: 'linear-gradient(135deg, #f3f4f6 0%, #e0e7ef 100%)',
        '@media (prefers-color-scheme: dark)': {
          background: 'linear-gradient(135deg, #0b0b0b 0%, #171717 100%)',
        },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      },
      // central card container
      container: {
        width: '100%',
        maxWidth: '900px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(16,24,40,0.08)',
        padding: '28px',
        margin: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        '@media (prefers-color-scheme: dark)': {
          background: '#161616',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        },
      },
      backLink: {
        display: 'inline-block',
        marginBottom: '6px',
        color: 'inherit',
        textDecoration: 'none',
        opacity: 0.85,
      },
      title: {
        fontSize: '2rem',
        fontWeight: 700,
        margin: 0,
        lineHeight: 1.08,
        color: '#0f172a',
        '@media (prefers-color-scheme: dark)': { color: '#ffffff' },
      },
      metaRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#475569',
        fontSize: '0.95rem',
        marginTop: '6px',
        marginBottom: '6px',
        '@media (prefers-color-scheme: dark)': { color: '#9ca3af' },
      },
      metaLeft: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      },
      metaRight: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
      },
      heroImg: {
        width: '100%',
        height: '420px',
        objectFit: 'cover',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(2,6,23,0.12)',
        marginTop: '8px',
        marginBottom: '8px',
        '@media (max-width: 640px)': { height: '220px' },
      },
      content: {
        lineHeight: 1.75,
        fontSize: '1rem',
        color: '#111827',
        '@media (prefers-color-scheme: dark)': { color: '#e6eef8' },
      },
      muted: {
        opacity: 0.8,
      },
  // likeRow/likeCount removed — likes are now anchored to metaRight
    });

    export default function BlogPost() {
      const { slug = '' } = useParams();
      const [post, setPost] = useState<BlogPostDetail | null>(null);
      const [error, setError] = useState<string | null>(null);
      const [likePending, setLikePending] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const { token } = useAuth() as any;
      const styles = useStyles();

      useEffect(() => {
        setPost(null);
        setError(null);
        getPostBySlug(slug)
          .then(setPost)
          .catch((e) => setError(String(e?.message || e)));
      }, [slug]);

      // If user is authenticated, check if they liked this post
      useEffect(() => {
        let cancelled = false;
        if (!token || !slug) { setIsLiked(false); return; }
        (async () => {
          try {
            const liked = await getLikedPosts(token);
            if (cancelled) return;
            setIsLiked(liked.some(p => p.slug === slug));
          } catch {
            // ignore auth errors
          }
        })();
        return () => { cancelled = true; };
      }, [token, slug]);

      // Track a view once per slug per window (6h) to avoid spamming the server
      useEffect(() => {
        if (!slug || !post || error) return;
        const key = `viewed:${slug}`;
        const now = Date.now();
        const last = Number(localStorage.getItem(key) || 0);
        const windowMs = 6 * 60 * 60 * 1000; // 6 hours
        if (!last || now - last > windowMs) {
          trackPostView(slug);
          try { localStorage.setItem(key, String(now)); } catch {}
        }
      }, [slug, post, error]);

      // Image state and attempt tracking must be declared unconditionally (hooks must run
      // in the same order on every render). Compute hero safely when post is null.
      const hero = post ? ((post as any).heroUrl ?? (post as any).heroImageUrl) : undefined;
      const [imgSrc, setImgSrc] = useState<string | null>(null);

      // Simplified: prefer server-provided heroUrl, otherwise use the canonical
      // assets image path. On error we immediately fall back to a single
      // placeholder and do not retry repeatedly.
      useEffect(() => {
        if (!slug) { setImgSrc(null); return; }
        if (hero) {
          setImgSrc(toAbsolute(hero));
          return;
        }
        // No hero: ask the API for assets (first jpg/png) and use it if available
        let cancelled = false;
        (async () => {
          try {
            const { getPostAssets } = await import('../lib/apis');
            const assets = await getPostAssets(slug);
            if (cancelled) return;
            if (Array.isArray(assets) && assets.length > 0) {
              setImgSrc(assets[0]);
              return;
            }
          } catch {
            // ignore
          }
          if (!cancelled) setImgSrc(`/static/posts/${slug}/assets/image.jpg`);
        })();
        return () => { cancelled = true; };
      }, [hero, slug]);

    if (error === 'not-found') {
        return (
          <div className={styles.root}>
            <div className={styles.container}>
              <p>Post not found.</p>
              <Link to="/blogs" className={styles.backLink}>← Back to blog</Link>
            </div>
          </div>
        );
      }
      if (error) return <div className={styles.root}><div className={styles.container}>Error: {error}</div></div>;
      if (!post) return <div className={styles.root}><div className={styles.container}>Loading…</div></div>;
    const mdxSource: string = (post as any).mdx ?? (post as any).content ?? '';
  const authorObj = (post as any).author as any;
  const authorName = authorObj?.name ?? (typeof authorObj === 'string' ? authorObj : undefined);
    const views = (post as any).views as number | undefined;

      // Local ErrorBoundary to catch render-time errors inside the BlogPost component
      class BlogPostErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
        constructor(props: any) { super(props); this.state = { hasError: false }; }
        static getDerivedStateFromError(err: any) { return { hasError: true, message: String(err?.message || err) }; }
        componentDidCatch(err: any, info: any) { console.error('[BlogPostErrorBoundary] render error', err, info); }
        render() {
          if (this.state.hasError) return (
            <div className={styles.root}>
              <div className={styles.container}>
                <h2>Post failed to render</h2>
                <p>{this.state.message || 'An error occurred while rendering this post.'}</p>
                <Link to="/blogs" className={styles.backLink}>← Back to blog</Link>
              </div>
            </div>
          );
          return this.props.children as any;
        }
      }

      return (
        <div className={styles.root}>
          <BlogPostErrorBoundary>
          <article className={styles.container}>
            <Link to="/blogs" className={styles.backLink}>← All posts</Link>
            <h1 className={styles.title}>{post.title}</h1>
            <div className={styles.metaRow}>
              <div className={styles.metaLeft}>
                <span>{new Date(post.createdOn).toLocaleDateString()}</span>
                {authorName && <span>· By {authorName}</span>}
                {(post as any).category?.name && <span>· {((post as any).category?.name)}</span>}
                {(typeof views === 'number') && <span>· 👁️ {views}</span>}
              </div>
              <div className={styles.metaRight}>
                <Button appearance="primary" disabled={likePending} onClick={async () => {
                if (!post) return;
                if (!token) {
                  // Redirect to login page
                  window.location.href = '/login';
                  return;
                }
                setLikePending(true);
                try {
                  const newLikes = await toggleLike(slug, token);
                  // compute updatedLikes to use for UI update and to broadcast
                  let updatedLikes: number | null = null;
                  if (typeof newLikes === 'number') {
                    updatedLikes = newLikes;
                    setPost((curr) => (curr ? { ...curr, likes: newLikes } : curr));
                  } else {
                    // optimistic fallback: increment/decrement locally so UI reflects change
                    setPost((curr) => {
                      if (!curr) return curr;
                      const prev = (curr as any).likes ?? 0;
                      const next = isLiked ? Math.max(0, prev - 1) : prev + 1;
                      updatedLikes = next;
                      return { ...curr, likes: next } as any;
                    });
                  }
                  setIsLiked(prev => !prev);

                  // Broadcast the updated likes so other components (Spotlight, Blogs) can update their local state
                  try {
                    const ev = new CustomEvent('post:likes-updated', { detail: { slug, likes: updatedLikes } });
                    window.dispatchEvent(ev);
                  } catch {
                    // ignore
                  }
                } catch (e: any) {
                  if (e?.message === 'auth-required') {
                    window.location.href = '/login';
                  }
                } finally {
                  setLikePending(false);
                }
              }}>
                {isLiked ? '✓ Liked' : '❤️ Like'}
              </Button>
              </div>
            </div>

            {imgSrc ? (
              <img
                src={imgSrc}
                alt={post.title || ''}
                className={styles.heroImg}
                onError={(e) => {
                  try {
                    const img = e.currentTarget as HTMLImageElement;
                    try { img.onerror = null; } catch {}
                    setImgSrc('/static/placeholder.jpg');
                  } catch {}
                }}
              />
            ) : null}

            {mdxSource ? (
              <div className={styles.content}>
                <MdxRenderer mdx={mdxSource} slug={post.slug} />
              </div>
            ) : (
              <p className={styles.muted}>No content available.</p>
            )}
          </article>
          </BlogPostErrorBoundary>
        </div>
      );
    }