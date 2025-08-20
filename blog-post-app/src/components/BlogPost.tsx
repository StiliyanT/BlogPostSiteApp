import { useEffect, useState } from 'react';
    import { useParams, Link } from 'react-router-dom';
    import { getPostBySlug, type BlogPostDetail, likePost, trackPostView } from '../lib/apis';
    import MdxRenderer from '../components/MdxRenderer';
    import { toAbsolute } from '../lib/urls';
    import { makeStyles, Button } from '@fluentui/react-components';

    const useStyles = makeStyles({
      root: {
        width: "100vw",
        height: "100vh",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f3f4f6 0%, #e0e7ef 100%)",
        '@media (prefers-color-scheme: dark)': {
          background: "linear-gradient(135deg, #171717 0%, #262626 100%)",
        },
      },
      container: {
        width: "100vw",
        margin: '0 auto',
        padding: '24px',
        justifyContent: "center",
        //display: "flex",
        flexDirection: "column",
        alignItems: "center",
      },
      backLink: {
        display: 'inline-block',
        marginBottom: '12px',
        color: 'inherit',
        textDecoration: 'none',
      },
      title: {
        marginBottom: '8px',
      },
      date: {
        display: 'block',
        opacity: 0.6,
        marginBottom: '12px',
      },
      author: {
        display: 'block',
        opacity: 0.8,
        marginBottom: '8px',
      },
      stats: {
        display: 'block',
        opacity: 0.7,
        marginBottom: '16px',
      },
      heroImg: {
        width: '80%',
        borderRadius: '12px',
        marginBottom: '16px',
        //cursor: 'zoom-in',
        display: 'flex',
      },
      content: {
        lineHeight: 1.65,
      },
      muted: {
        opacity: 0.8,
      },
      likeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '8px',
        marginBottom: '16px',
      },
      likeCount: {
        opacity: 0.9,
        fontWeight: 600,
      },
    });

    export default function BlogPost() {
      const { slug = '' } = useParams();
      const [post, setPost] = useState<BlogPostDetail | null>(null);
      const [error, setError] = useState<string | null>(null);
      const [likePending, setLikePending] = useState(false);
      const styles = useStyles();

      useEffect(() => {
        setPost(null);
        setError(null);
        getPostBySlug(slug)
          .then(setPost)
          .catch((e) => setError(String(e?.message || e)));
      }, [slug]);

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
          <div className={styles.container}>
            <p>Post not found.</p>
            <Link to="/blog" className={styles.backLink}>← Back to blog</Link>
          </div>
        );
      }
      if (error) return <div className={styles.container}>Error: {error}</div>;
      if (!post) return <div className={styles.container}>Loading…</div>;

      const hero = (post as any).heroUrl ?? (post as any).heroImageUrl;
      const mdxSource: string = (post as any).mdx ?? (post as any).content ?? '';
      const author = (post as any).author as string | undefined;
      const views = (post as any).views as number | undefined;
      const likes = (post as any).likes as number | undefined;

      return (
        <article className={styles.container}>
          <Link to="/blog" className={styles.backLink}>← All posts</Link>
          {/* <h1 className={styles.title}>{post.title}</h1> */}
          <small className={styles.date}>
            {new Date(post.createdOn).toLocaleDateString()}
          </small>
          {author && (
            <small className={styles.author}>By {author}</small>
          )}

          <div className={styles.likeRow}>
            <Button appearance="primary" disabled={likePending} onClick={async () => {
              if (!post) return;
              setLikePending(true);
              // optimistic update
              setPost({ ...post, likes: (post.likes ?? 0) + 1 });
              try {
                const newLikes = await likePost(slug);
                if (typeof newLikes === 'number') {
                  setPost((curr) => (curr ? { ...curr, likes: newLikes } : curr));
                } else {
                  // If API returns no body, refetch to get the persisted value
                  const refreshed = await getPostBySlug(slug);
                  setPost(refreshed);
                }
              } catch (e) {
                // rollback optimistic update on error
                setPost((curr) => (curr ? { ...curr, likes: Math.max(0, (curr.likes ?? 1) - 1) } : curr));
              } finally {
                setLikePending(false);
              }
            }}>
              ❤️ Like
            </Button>
            <span className={styles.likeCount}>{(post?.likes ?? 0).toString()}</span>
          </div>

          {(typeof views === 'number' || typeof likes === 'number') && (
            <small className={styles.stats}>
              {typeof views === 'number' ? `👁️ ${views}` : ''}
              {typeof views === 'number' && typeof likes === 'number' ? ' · ' : ''}
              {typeof likes === 'number' ? `❤️ ${likes}` : ''}
            </small>
          )}

          {hero ? (
            <a href={toAbsolute(hero)} target="_blank" rel="noopener noreferrer">
              <img
                src={toAbsolute(hero)}
                alt=""
                className={styles.heroImg}
              />
            </a>
          ) : null}

          {mdxSource ? (
            <div className={styles.content}>
              <MdxRenderer mdx={mdxSource} slug={post.slug} />
            </div>
          ) : (
            <p className={styles.muted}>No content available.</p>
          )}
        </article>
      );
    }