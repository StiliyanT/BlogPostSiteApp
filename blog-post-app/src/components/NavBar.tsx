import { type FC } from "react";
import { Toolbar, ToolbarButton, makeStyles, shorthands } from "@fluentui/react-components";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import AccountPanel from "./AccountPanel";


const useNavBarStyles = makeStyles({
  root: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    zIndex: 1000,
    // Glass/blur background
    backgroundColor: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    ...shorthands.borderBottom('1px', 'solid', 'rgba(229,231,235,0.85)'),
    paddingTop: '10px',
    paddingBottom: '10px',
    boxSizing: 'border-box',
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(23,23,23,0.75)',
      ...shorthands.borderBottom('1px', 'solid', 'rgba(64,64,64,0.85)'),
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
    },
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '1100px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: '16px',
    paddingRight: '16px',
    boxSizing: 'border-box',
  },
  center: {
    flex: 1,
    display: 'none',
    justifyContent: 'center',
    '@media (min-width: 768px)': {
      display: 'flex',
    },
  },
  right: {
    display: 'none',
    alignItems: 'center',
    justifyContent: 'flex-end',
    '@media (min-width: 768px)': {
      display: 'flex',
    },
    gap: '0.5rem',
  },
  brand: {
    fontWeight: 800,
    fontSize: '18px',
    letterSpacing: '0.5px',
    userSelect: 'none',
    backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
  mobileMenuButton: {
    display: 'block',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    outline: 'none',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    '@media (min-width: 768px)': {
      display: 'none',
    },
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  mobileMenu: {
    position: 'fixed',
    top: 'var(--app-nav-height, 64px)',
    left: 0,
    width: '100vw',
    backgroundColor: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingTop: '0.5rem',
    paddingBottom: '1rem',
    zIndex: 100,
    '@media (min-width: 768px)': {
      display: 'none',
    },
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(23,23,23,0.98)',
    },
  },
  mobileBottomRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  mobileMenuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.25)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    zIndex: 99,
    '@media (min-width: 768px)': {
      display: 'none',
    },
  },
  navBtn: {
    borderRadius: '10px',
    padding: '6px 10px',
    selectors: {
      '&:where(:hover)': { backgroundColor: 'rgba(156,163,175,0.12)' },
      '@media (prefers-color-scheme: dark)': {
        '&:where(:hover)': { backgroundColor: 'rgba(156,163,175,0.18)' },
      },
    },
  },
  navBtnActive: {
    backgroundColor: 'rgba(99,102,241,0.14)',
    selectors: {
      '@media (prefers-color-scheme: dark)': {
        backgroundColor: 'rgba(99,102,241,0.22)',
      },
    },
  },
  authBtn: {
    borderRadius: '9999px',
    ...shorthands.border('1px', 'solid', 'rgba(156,163,175,0.5)'),
    padding: '6px 12px',
    selectors: {
      '&:where(:hover)': { backgroundColor: 'rgba(156,163,175,0.10)' },
      '@media (prefers-color-scheme: dark)': {
        '&:where(:hover)': { backgroundColor: 'rgba(156,163,175,0.16)' },
      },
    },
  },
});

const NavBar: FC = () => {
  const [dark] = useState(() =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { token, email } = useAuth() as any;
  const { pathname } = useLocation();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const styles = useNavBarStyles();
  return (
    <nav className={styles.root} style={{ ["--app-nav-height" as any]: '64px' }}>
      <div className={styles.container}>
        {/* Website name on the left */}
        <div className={styles.left}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span className={styles.brand}>Lumora</span>
          </Link>
        </div>
        {/* Mobile menu button */}
        <button
          className={styles.mobileMenuButton}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span style={{ fontSize: 24 }}>☰</span>
        </button>
        {/* Centered nav links (hidden on mobile, visible on md+) */}
        <div className={styles.center}>
          <Toolbar>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <ToolbarButton as="a" appearance="subtle" className={`${styles.navBtn} ${isActive('/') ? styles.navBtnActive : ''}`}>
              Home
            </ToolbarButton>
          </Link>
          <Link to="/blogs" style={{ textDecoration: 'none' }}>
            <ToolbarButton as="a" appearance="subtle" className={`${styles.navBtn} ${isActive('/blogs') ? styles.navBtnActive : ''}`}>
              Blogs
            </ToolbarButton>
          </Link>
          <Link to="/about" style={{ textDecoration: 'none' }}>
            <ToolbarButton as="a" appearance="subtle" className={`${styles.navBtn} ${isActive('/about') ? styles.navBtnActive : ''}`}>
              About
            </ToolbarButton>
          </Link>
          <Link to="/contact" style={{ textDecoration: 'none' }}>
            <ToolbarButton as="a" appearance="subtle" className={`${styles.navBtn} ${isActive('/contact') ? styles.navBtnActive : ''}`}>
              Contact
            </ToolbarButton>
          </Link>
          </Toolbar>
        </div>
        {/* Right-aligned auth actions (desktop) */}
        <div className={styles.right}>
          <Toolbar>
            <ToolbarButton
              as="button"
              appearance="subtle"
              onClick={() => setUserMenuOpen(true)}
              aria-label="Open account menu"
              className={styles.authBtn}
            >
              {token ? (email || 'Account') : 'Log in'}
            </ToolbarButton>
          </Toolbar>
        </div>
      </div>
      {/* Mobile menu (visible when open) */}
      {menuOpen && <>
        <div className={styles.mobileMenuOverlay} onClick={() => setMenuOpen(false)} />
        <div className={styles.mobileMenu}>
          <Toolbar vertical>
            <Link to="/" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
              <ToolbarButton as="a" appearance="subtle" className={`${styles.navBtn} ${isActive('/') ? styles.navBtnActive : ''}`}>
                Home
              </ToolbarButton>
            </Link>
             <Link to="/blogs" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
              <ToolbarButton as="a" appearance="subtle" className={`${styles.navBtn} ${isActive('/blogs') ? styles.navBtnActive : ''}`}>
                Blogs
              </ToolbarButton>
            </Link>
            <Link to="/about" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
              <ToolbarButton as="a" appearance="subtle" className={`${styles.navBtn} ${isActive('/about') ? styles.navBtnActive : ''}`}>
                About
              </ToolbarButton>
            </Link>
            <Link to="/contact" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
              <ToolbarButton as="a" appearance="subtle" className={`${styles.navBtn} ${isActive('/contact') ? styles.navBtnActive : ''}`}>
                Contact
              </ToolbarButton>
            </Link>
          </Toolbar>
          <div className={styles.mobileBottomRow}>
            <ToolbarButton as="button" appearance="subtle" className={styles.authBtn} onClick={() => { setMenuOpen(false); setUserMenuOpen(true); }}>
              {token ? (email || 'Account') : 'Log in'}
            </ToolbarButton>
          </div>
        </div>
      </>}

  {/* User Account Right Panel (standalone component) */}
  <AccountPanel open={userMenuOpen} onClose={() => setUserMenuOpen(false)} />
    </nav>
  );
};

export default NavBar;
