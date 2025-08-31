import type { FC } from "react";
import { Card, makeStyles } from "@fluentui/react-components";
import { Link } from "react-router-dom";

interface SpotlightCardProps {
  name: string;
  image: string;
  slug?: string;
  author: string;
  views: number;
  likes: number;
  createdOn?: string | Date;
  to?: string; // optional route target
  isNew?: boolean; // highlight newest post
  onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>) => void;
}

const useStyles = makeStyles({
  card: {
    width: "100%",
    maxWidth: "350px",
    minHeight: "320px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    position: "relative",
    overflow: "hidden",
    borderRadius: "1rem",
    boxShadow: "0 4px 24px 0 rgba(30,30,30,0.10)",
    margin: "0 auto",
    backgroundColor: "#23272f",
    cursor: 'pointer',
  },
  link: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
  },
  preview: {}, // not used
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "180px",
    background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 100%)",
    zIndex: 1,
    borderTopLeftRadius: "1rem",
    borderTopRightRadius: "1rem",
  },
  author: {
    position: "absolute",
    top: "12px",
    left: "16px",
    zIndex: 2,
    color: "#fff",
    fontSize: "0.95rem",
    fontWeight: 500,
    textShadow: "0 1px 4px rgba(0,0,0,0.25)",
  },
  authorInline: {
    fontSize: '0.95rem',
    color: '#9ca3af',
    marginTop: '-0.25rem',
    marginBottom: '0.35rem',
    '@media (prefers-color-scheme: dark)': {
      color: '#d1d5db',
    },
  },
  badge: {
    position: "absolute",
    top: "12px",
    right: "16px",
    zIndex: 2,
    backgroundColor: "#f97316", // orange-500
    color: "#fff",
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "0.2rem 0.5rem",
    borderRadius: "999px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  },
  content: {
    padding: "1.25rem 1.25rem 1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    background: "inherit",
    zIndex: 2,
  },
  stats: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    marginTop: "0.5rem",
    color: "#374151",
    fontSize: "1rem",
    '@media (prefers-color-scheme: dark)': {
      color: "#d1d5db",
    },
  },
  statIcon: {
    marginRight: "0.4rem",
    fontSize: "1.1em",
    verticalAlign: "middle",
  },
  name: {
    fontSize: "1.35rem",
    fontWeight: 600,
    color: "#fff",
    textShadow: "0 1px 4px rgba(0,0,0,0.25)",
    margin: 0,
    '@media (prefers-color-scheme: dark)': {
      color: "#fff",
    },
  },
  date: {
    fontSize: "0.9rem",
    color: "#e5e7eb",
    opacity: 0.85,
  },
});

const SpotlightCard: FC<SpotlightCardProps> = ({ name, image, slug, author, views, likes, createdOn, to, isNew, onClick }) => {
  const styles = useStyles();
  const dateLabel = createdOn ? new Date(createdOn).toLocaleDateString() : null;

  const content = (
    <Card className={styles.card} role={to ? 'link' : undefined}>
      <div style={{ position: "relative", width: "100%", height: "180px", overflow: "hidden", backgroundColor: "#111827" }}>
        <img
          src={image}
          alt={name}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            // Keep track of attempted fallbacks to avoid loops
            const tried = (img.dataset.triedFallbacks || '').split(',').filter(Boolean);
            const files = ['hero.jpg', 'hero.png', 'image.png', 'image.jpg'];
            const bases: string[] = [];
            if (typeof slug === 'string' && slug) {
              bases.push(`/static/posts/${slug}/assets`);
              bases.push(`/static/posts/posts/${slug}/assets`);
            }

            // If the current src already has a filename, mark it tried
            try {
              const currentName = img.src.split('/').pop() || '';
              if (currentName && !tried.includes(currentName)) tried.push(currentName);
            } catch { /* ignore parsing errors */ }

            // Build candidate paths and pick the next one we haven't tried
            let picked: string | undefined;
            for (const b of bases) {
              for (const f of files) {
                const candidate = `${b}/${f}`;
                if (!tried.includes(candidate) && picked === undefined) {
                  picked = candidate;
                }
              }
            }

            if (picked) {
              tried.push(picked);
              img.dataset.triedFallbacks = tried.join(',');
              img.src = picked;
              // eslint-disable-next-line no-console
              console.warn('[SpotlightCard] image failed, trying fallback static path', img.src);
              return;
            }

            // final fallback
            img.dataset.triedFallbacks = tried.join(',');
            img.src = '/static/placeholder.jpg';
          }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(30,30,30,0.35)" }} />
        <span className={styles.author} style={{ position: "absolute", top: 12, left: 16, color: "#fff", textShadow: "0 1px 4px #000", zIndex: 1 }}>{author}</span>
        {isNew && (
          <span className={styles.badge} aria-label="Newest post">NEW</span>
        )}
      </div>
      <div className={styles.content}>
  <h3 className={styles.name}>{name}</h3>
  {author && <div className={styles.authorInline}>{author}</div>}
        {dateLabel && (
          <div className={styles.date}>Created on {dateLabel}</div>
        )}
        <div className={styles.stats}>
          <span>
            <span className={styles.statIcon} role="img" aria-label="views">👁️</span>
            {views}
          </span>
          <span>
            <span className={styles.statIcon} role="img" aria-label="likes">❤️</span>
            {likes}
          </span>
        </div>
      </div>
    </Card>
  );

  return to ? (
    <Link to={to} className={styles.link} aria-label={`Open ${name}`} onClick={onClick}>
      {content}
    </Link>
  ) : (
    <div onClick={onClick}>{content}</div>
  );
};

export default SpotlightCard;
