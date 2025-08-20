import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  useToastController,
  Toast,
  ToastTitle,
  makeStyles,
  shorthands,
  tokens,
  Field,
  Input,
  Button,
  Checkbox,
  checkboxClassNames,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  page: {
  minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
    backgroundImage: 'radial-gradient(1200px 600px at 20% -10%, rgba(59,130,246,0.18), transparent), radial-gradient(1000px 600px at 110% 10%, rgba(99,102,241,0.16), transparent)',
  },
  card: {
    position: 'relative',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(8px)',
    ...shorthands.border('1px', 'solid', 'rgba(229,231,235,0.8)'),
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    ...shorthands.borderRadius('16px'),
    ...shorthands.padding('24px'),
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(23,23,23,0.75)',
      backdropFilter: 'blur(10px)',
      ...shorthands.border('1px', 'solid', 'rgba(64,64,64,0.85)'),
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
    },
  },
  title: {
    margin: '4px 0 12px',
    fontSize: '24px',
    fontWeight: 600,
  },
  subtitle: {
    margin: '0 0 12px',
    color: tokens.colorNeutralForeground2,
    fontSize: '14px',
  },
  accent: {
    width: '48px',
    height: '4px',
    backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    borderRadius: '999px',
    marginBottom: '12px',
  },
  error: {
    color: 'crimson',
    marginBottom: '8px',
    minHeight: '24px',
    backgroundColor: 'rgba(220,38,38,0.08)',
    ...shorthands.border('1px', 'solid', 'rgba(220,38,38,0.35)'),
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('8px', '10px'),
  },
  hint: {
    height: '18px',
    color: '#6b7280',
    fontSize: '13px',
    marginTop: '4px',
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  footer: { marginTop: '12px', color: tokens.colorNeutralForeground2 },
  fullWidth: { width: '100%' },
  fieldGap: { marginTop: '10px' },
  resendWrap: { marginTop: '6px' },
  link: { color: tokens.colorBrandForegroundLink, textDecorationLine: 'none' },
  input: {
    backgroundColor: '#ffffff',
    ...shorthands.border('1px', 'solid', '#cbd5e1'),
    ...shorthands.borderRadius('8px'),
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: '160ms',
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#171717',
      ...shorthands.border('1px', 'solid', '#404040'),
    },
    selectors: {
      '&:where(:hover)': { ...shorthands.borderColor('#94a3b8') },
      '&:where(:focus-within)': {
        ...shorthands.borderColor('#3b82f6'),
        outline: '2px solid #93c5fd',
        outlineOffset: '2px',
        boxShadow: '0 0 0 4px rgba(59,130,246,0.20)'
      },
      '&:where(:disabled)': {
        ...shorthands.borderColor('#e5e7eb'),
        backgroundColor: '#f9fafb',
      },
    },
  },
  ctaBtn: {
    backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    backgroundSize: '200% 100%',
    backgroundPosition: '0% 0%',
    border: 'none',
    color: '#fff',
    height: '40px',
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
  checkbox: {
    selectors: {
      [`& .${checkboxClassNames.indicator}`]: {
        width: '18px',
        height: '18px',
        ...shorthands.border('2px', 'solid', '#94a3b8'),
        ...shorthands.borderRadius('6px'),
        transition: 'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
      },
      [`&:where(:hover) .${checkboxClassNames.indicator}`]: {
        ...shorthands.borderColor('#64748b'),
      },
      [`&:where(:focus-within) .${checkboxClassNames.indicator}`]: {
        ...shorthands.borderColor('#3b82f6'),
        boxShadow: '0 0 0 3px rgba(59,130,246,0.25)',
      },
      [`& .${checkboxClassNames.input}:checked ~ .${checkboxClassNames.indicator}`]: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
      },
      [`& .${checkboxClassNames.input}:disabled ~ .${checkboxClassNames.indicator}`]: {
        ...shorthands.borderColor('#e5e7eb'),
        backgroundColor: '#f3f4f6',
      },
      [`& .${checkboxClassNames.label}`]: {
        marginLeft: '10px',
        fontSize: '13px',
        color: tokens.colorNeutralForeground2,
      },
    },
  },
});

export default function Login() {
  const { login, token, resendConfirmation } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { dispatchToast } = useToastController('app-toaster');
  const navigate = useNavigate();
  const styles = useStyles();

  if (token) return <Navigate to="/" replace />;

  const isValidEmail = useMemo(() => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email), [email]);
  const canSubmit = isValidEmail && password.length > 0 && !pending;

  useEffect(() => {
    if (token) {
      // Delay a tick so toasts render, then navigate home
      const t = setTimeout(() => navigate('/'), 0);
      return () => clearTimeout(t);
    }
  }, [token, navigate]);

  // Robust redirect: if a token appears, programmatically navigate as a fallback
  // This complements the inline <Navigate/> guard and avoids getting stuck on /login
  // in edge cases.
  if (typeof window !== 'undefined') {
    // useEffect-like guard without importing useEffect to keep edits minimal here
    // We still prefer a proper effect below; this block is intentionally left empty.
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      dispatchToast(
        <Toast>
          <ToastTitle>Signed in successfully</ToastTitle>
        </Toast>,
        { intent: 'success', timeout: 2500 }
      );
      // Navigate immediately; if something prevents client routing, force a hard redirect shortly after
      navigate('/', { replace: true });
      setTimeout(() => {
        if (window?.location?.pathname === '/login') {
          window.location.replace('/');
        }
      }, 200);
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.card}>
    <div className={styles.accent} />
    <h2 className={styles.title}>Welcome back</h2>
    <p className={styles.subtitle}>Sign in to manage your posts and account.</p>
    {error && (
          <div className={styles.error} aria-live="polite">
            {error}
            {error.toLowerCase().includes('confirm') && (
              <div className={styles.resendWrap}>
                <Button
                  appearance="secondary"
                  size="small"
                  onClick={async () => {
                    try {
                      await resendConfirmation(email);
                      dispatchToast(
                        <Toast>
                          <ToastTitle>Confirmation email sent</ToastTitle>
                        </Toast>,
                        { intent: 'info', timeout: 3000 }
                      );
                    } catch {}
                  }}
                  disabled={!isValidEmail}
                >
                  Resend confirmation email
                </Button>
              </div>
            )}
          </div>
        )}
    <form onSubmit={submit} noValidate>
          <Field label="Email">
            <Input
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              type="email"
              appearance="outline"
              aria-describedby="login-email-hint"
        contentBefore={email ? '📧' : undefined}
              className={styles.input}
              required
            />
          </Field>
          <div id="login-email-hint" aria-live="polite" className={styles.hint} style={{ color: email && !isValidEmail ? 'crimson' as const : '#6b7280' }}>
            {email && !isValidEmail ? 'Enter a valid email address' : ''}
          </div>

      <div className={styles.fieldGap} />

          <Field label="Password">
            <Input
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              type={showPw ? 'text' : 'password'}
              appearance="outline"
              aria-describedby="login-password-hint"
        contentBefore={password ? '🔒' : undefined}
              className={styles.input}
              required
            />
          </Field>
          <div className={styles.actionsRow}>
            <Checkbox className={styles.checkbox} checked={showPw} onChange={(_, data) => setShowPw(!!data.checked)} label="Show password" />
            {/* Placeholder for future: Forgot password */}
          </div>
          <div id="login-password-hint" aria-live="polite" className={styles.hint}></div>

      <div style={{ height: 16 }} />

          <Button appearance="primary" type="submit" disabled={!canSubmit} className={`${styles.fullWidth} ${styles.ctaBtn}`}>
            {pending ? 'Signing in…' : 'Login'}
          </Button>
        </form>
        <div className={styles.footer}>
      No account? <a className={styles.link} href="/register">Create one</a>
        </div>
      </div>
    </section>
  );
}
