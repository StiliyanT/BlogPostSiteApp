import { useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Button, makeStyles, shorthands, tokens } from "@fluentui/react-components";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from 'react';
import SpotlightCard from './SpotlightCard';
import { getLikedPosts } from '../lib/apis';

export type AccountPanelProps = {
  open: boolean;
  onClose: () => void;
};

const useStyles = makeStyles({
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(3px)',
    opacity: 0,
    transition: 'opacity 180ms ease',
    pointerEvents: 'none',
    zIndex: 1000,
  },
  overlayOpen: { opacity: 1, pointerEvents: 'auto' },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: '360px',
    maxWidth: '88vw',
    backgroundColor: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(10px)',
    ...shorthands.borderLeft('1px', 'solid', 'rgba(229,231,235,0.8)'),
    boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
    boxSizing: 'border-box',
    overscrollBehavior: 'contain',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
    zIndex: 1001,
    transform: 'translateX(100%)',
    transition: 'transform 220ms ease',
    ...shorthands.borderRadius('16px 0 0 16px'),
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(23,23,23,0.75)',
      ...shorthands.borderLeft('1px', 'solid', 'rgba(64,64,64,0.85)'),
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
    },
  },
  panelOpen: { transform: 'translateX(0%)' },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: 0,
  },
  accent: {
    width: '48px',
    height: '4px',
    backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    borderRadius: '999px',
    margin: '4px 0 12px',
  },
  closeBtn: {
    padding: '0.4rem 0.6rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    selectors: { '&:focus-visible': { outline: '2px solid #60a5fa', outlineOffset: '2px' } },
  },
  userCard: { display: 'flex', alignItems: 'center', ...shorthands.gap('0.75rem'), marginBottom: '0.75rem' },
  avatar: {
    width: '40px',
    height: '40px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: '#fff',
    backgroundImage: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    ...shorthands.borderRadius('9999px'),
    boxShadow: '0 6px 14px rgba(99,102,241,0.25)'
  },
  userMeta: { fontSize: '0.95rem', color: tokens.colorNeutralForeground2 },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('0.5rem'),
    marginTop: '0.5rem',
  },
  ctaBtn: {
    backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    backgroundSize: '200% 100%',
    backgroundPosition: '0% 0%',
    border: 'none',
    color: '#fff',
    height: '36px',
    fontWeight: 600,
    ...shorthands.borderRadius('9999px'),
    boxShadow: '0 8px 16px rgba(99,102,241,0.25)',
    transition: 'background-position 200ms ease, filter 160ms ease, transform 120ms ease, box-shadow 200ms ease',
    selectors: {
      '&:hover': { filter: 'brightness(1.05)', backgroundPosition: '100% 0%' },
      '&:active': { transform: 'translateY(1px)', boxShadow: '0 6px 12px rgba(99,102,241,0.25)' },
      '&:focus-visible': { outline: '2px solid #93c5fd', outlineOffset: '2px' },
      '&[disabled]': { filter: 'grayscale(20%) brightness(0.9)', cursor: 'not-allowed', boxShadow: 'none' },
    },
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    ...shorthands.border('1px', 'solid', 'rgba(156,163,175,0.5)'),
    ...shorthands.borderRadius('10px'),
    height: '36px',
    selectors: {
      '&:hover': { backgroundColor: 'rgba(156,163,175,0.08)' },
      '&:focus-visible': { outline: '2px solid #93c5fd', outlineOffset: '2px' },
    },
  },
  linkWrap: { textDecoration: 'none' },
});

export default function AccountPanel({ open, onClose }: AccountPanelProps) {
  const styles = useStyles();
  const { token, roles, logout, email } = useAuth() as any;
  const [likedCount, setLikedCount] = useState<number | null>(null);
  const [showLiked, setShowLiked] = useState(false);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const isAdmin = Array.isArray(roles) && roles.includes('Admin');
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus the close button when opened
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => closeRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Lock page scroll while open and compensate scrollbar width to avoid layout shift
  useEffect(() => {
    if (!open) return;
    const docEl = document.documentElement;
    const prevHtmlOverflow = docEl.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    docEl.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.paddingRight = prevBodyPaddingRight;
      docEl.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  const content = (
    <>
      <div className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`} onClick={onClose} aria-hidden />
      <aside
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        role="dialog"
        aria-label="User account menu"
        aria-modal="true"
      >
        <div className={styles.headerRow}>
          <h3 className={styles.title}>Account</h3>
          <button ref={closeRef} className={styles.closeBtn} onClick={onClose} aria-label="Close account menu">✕</button>
        </div>
        <div className={styles.accent} />
        <div className={styles.userCard}>
          <div className={styles.avatar}>{(email || 'U').slice(0, 1).toUpperCase()}</div>
          <div className={styles.userMeta}>
            {token ? (
              <>
                <div><strong>{email || 'Unknown'}</strong></div>
                <div>Roles: {roles?.length ? roles.join(', ') : 'None'}</div>
              </>
            ) : (
              <div>You are not signed in.</div>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          {!token && (
            <>
              <Link to="/login" className={styles.linkWrap} onClick={onClose}>
                <Button className={styles.ctaBtn} appearance="primary" size="medium">
                  Login
                </Button>
              </Link>
              <Link to="/register" className={styles.linkWrap} onClick={onClose}>
                <Button className={styles.outlineBtn} appearance="secondary" size="medium">
                  Create account
                </Button>
              </Link>
            </>
          )}
          {token && (
            <Button className={styles.ctaBtn} appearance="primary" size="medium" onClick={() => { logout(); onClose(); }}>
              Logout
            </Button>
          )}
          {token && (
            <Button className={styles.outlineBtn} appearance="secondary" size="medium" onClick={async () => {
              // toggle liked posts view
              if (!showLiked) {
                try {
                  const posts = await getLikedPosts(token);
                  // normalize author field to a display string (API may return object)
                  const normalized = posts.map(p => ({ ...p, author: (p as any).author?.name ?? (typeof (p as any).author === 'string' ? (p as any).author : 'Unknown') }));
                  setLikedPosts(normalized as any[]);
                  setLikedCount(normalized.length);
                  setShowLiked(true);
                } catch {
                  setLikedCount(0);
                }
              } else {
                setShowLiked(false);
              }
            }}>
              Liked posts{typeof likedCount === 'number' ? ` (${likedCount})` : ''}
            </Button>
          )}
          {token && isAdmin && (
            <Link to="/admin" className={styles.linkWrap} onClick={onClose}>
              <Button className={styles.outlineBtn} appearance="secondary" size="medium">
                Admin Panel
              </Button>
            </Link>
          )}
        </div>
        {/* Liked posts list (when toggled) */}
        {showLiked && (
          <div style={{ marginTop: '12px' }}>
            {likedPosts.length === 0 ? (
              <div style={{ color: 'rgba(0,0,0,0.6)' }}>No liked posts found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {likedPosts.map(p => (
                  <SpotlightCard key={p.slug} name={p.title} image={p.heroUrl ?? '/placeholder.jpg'} author={p.author ?? 'Unknown'} views={p.views ?? 0} likes={p.likes ?? 0} createdOn={p.createdOn} to={`/blog/${p.slug}`} />
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );

  // Render into a portal to avoid parent stacking contexts
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}
