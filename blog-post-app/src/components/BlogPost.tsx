import { useEffect, useState } from 'react';
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
        color: '#475569',
        fontSize: '0.95rem',
        marginTop: '6px',
        marginBottom: '6px',
        '@media (prefers-color-scheme: dark)': { color: '#9ca3af' },
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
      likeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '8px',
        marginBottom: '8px',
      },
      likeCount: {
        opacity: 0.95,
        fontWeight: 700,
      },
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

      const hero = (post as any).heroUrl ?? (post as any).heroImageUrl;
      const mdxSource: string = (post as any).mdx ?? (post as any).content ?? '';
  const authorObj = (post as any).author as any;
  const authorName = authorObj?.name ?? (typeof authorObj === 'string' ? authorObj : undefined);
      const views = (post as any).views as number | undefined;
      const likes = (post as any).likes as number | undefined;

      return (
        <div className={styles.root}>
          <article className={styles.container}>
            <Link to="/blogs" className={styles.backLink}>← All posts</Link>
            <h1 className={styles.title}>{post.title}</h1>
            <div className={styles.metaRow}>
              <span>{new Date(post.createdOn).toLocaleDateString()}</span>
              {authorName && <span>· By {authorName}</span>}
              {(typeof views === 'number' || typeof likes === 'number') && (
                <span>
                  {(typeof views === 'number' ? `👁️ ${views}` : '')}
                  {(typeof views === 'number' && typeof likes === 'number') ? '  ·  ' : ''}
                  {(typeof likes === 'number' ? `❤️ ${likes}` : '')}
                </span>
              )}
            </div>

            {hero ? (
              <a href={toAbsolute(hero)} target="_blank" rel="noopener noreferrer">
                <img src={toAbsolute(hero)} alt={post.title || ''} className={styles.heroImg} />
              </a>
            ) : null}

            <div className={styles.likeRow}>
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
                    if (typeof newLikes === 'number') {
                      setPost((curr) => (curr ? { ...curr, likes: newLikes } : curr));
                    } else {
                      // optimistic fallback: increment/decrement locally so UI reflects change
                      setPost((curr) => {
                        if (!curr) return curr;
                        const prev = (curr as any).likes ?? 0;
                        const next = isLiked ? Math.max(0, prev - 1) : prev + 1;
                        return { ...curr, likes: next } as any;
                      });
                    }
                    setIsLiked(prev => !prev);
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
              <span className={styles.likeCount}>{(post?.likes ?? 0).toString()}</span>
            </div>

            {mdxSource ? (
              <div className={styles.content}>
                <MdxRenderer mdx={mdxSource} slug={post.slug} />
              </div>
            ) : (
              <p className={styles.muted}>No content available.</p>
            )}
          </article>
        </div>
      );
    }