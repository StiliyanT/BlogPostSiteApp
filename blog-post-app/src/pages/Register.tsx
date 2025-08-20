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
    backgroundImage:
      'radial-gradient(1200px 600px at 20% -10%, rgba(59,130,246,0.18), transparent), radial-gradient(1000px 600px at 110% 10%, rgba(99,102,241,0.16), transparent)',
  },
  card: {
    position: 'relative',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '480px',
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
  title: { margin: '4px 0 12px', fontSize: '24px', fontWeight: 600 },
  subtitle: { margin: '0 0 12px', color: tokens.colorNeutralForeground2, fontSize: '14px' },
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
  hint: { height: '18px', color: '#6b7280', fontSize: '13px', marginTop: '4px' },
  actionsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' },
  footer: { marginTop: '12px', color: tokens.colorNeutralForeground2 },
  fullWidth: { width: '100%' },
  fieldGap: { marginTop: '10px' },
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
        boxShadow: '0 0 0 4px rgba(59,130,246,0.20)',
      },
      '&:where(:disabled)': { ...shorthands.borderColor('#e5e7eb'), backgroundColor: '#f9fafb' },
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
    columnGap: '10px',
    alignItems: 'center',
    selectors: {
      [`& .${checkboxClassNames.indicator}`]: {
        width: '18px',
        height: '18px',
        ...shorthands.border('2px', 'solid', '#94a3b8'),
        ...shorthands.borderRadius('6px'),
        transition: 'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
      },
      [`&:where(:hover) .${checkboxClassNames.indicator}`]: { ...shorthands.borderColor('#64748b') },
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
      [`& .${checkboxClassNames.label}`]: { marginLeft: '10px', fontSize: '13px', lineHeight: '18px', color: tokens.colorNeutralForeground2 },
    },
  },
});

export default function Register() {
  const { register: registerUser, token } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { dispatchToast } = useToastController('app-toaster');
  const navigate = useNavigate();
  const styles = useStyles();

  if (token) return <Navigate to="/" replace />;

  const isValidEmail = useMemo(() => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email), [email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setPending(true);
    try {
      await registerUser(email, password);
      dispatchToast(
        <Toast>
          <ToastTitle>Account created. Welcome!</ToastTitle>
        </Toast>,
        { intent: 'success', timeout: 2500 }
      );
  // Rely on token-driven redirect in routes; no manual navigate
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in (e as any) ? (e as any).message as string : 'Registration failed';
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  // Password policy (mirror ASP.NET Core Identity defaults)
  const hasMinLength = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const passesPolicy = hasMinLength && hasUpper && hasLower && hasDigit && hasSymbol;
  const confirmMatches = confirm.length > 0 && confirm === password;
  const canSubmit = isValidEmail && passesPolicy && confirmMatches && !pending;
  useEffect(() => {
    if (token) {
      const t = setTimeout(() => navigate('/'), 0);
      return () => clearTimeout(t);
    }
  }, [token, navigate]);

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.accent} />
        <h2 className={styles.title}>Create account</h2>
        <p className={styles.subtitle}>Sign up to manage your posts and account.</p>
        {error && (
          <div className={styles.error} aria-live="polite">{error}</div>
        )}
        <form onSubmit={submit} noValidate>
          <Field label="Email">
            <Input
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              type="email"
              appearance="outline"
              aria-describedby="register-email-hint"
              contentBefore={email ? '📧' : undefined}
              className={styles.input}
              required
            />
          </Field>
          <div
            id="register-email-hint"
            aria-live="polite"
            className={styles.hint}
            style={{ color: email && !isValidEmail ? 'crimson' as const : '#6b7280' }}
          >
            {email && !isValidEmail ? 'Enter a valid email address' : ''}
          </div>

          <div className={styles.fieldGap} />

          <Field label="Password">
            <Input
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              type={showPw ? 'text' : 'password'}
              appearance="outline"
              aria-describedby="pw-hints"
              contentBefore={password ? '🔒' : undefined}
              className={styles.input}
              required
              minLength={6}
            />
          </Field>

          <div className={styles.actionsRow}>
            <Checkbox
              className={styles.checkbox}
              checked={showPw}
              onChange={(_, data) => setShowPw(!!data.checked)}
              label="Show password"
            />
          </div>

          {/* Live password hints mirroring Identity defaults */}
          <ul
            id="pw-hints"
            aria-live="polite"
            style={{ margin: '6px 0 8px 0', paddingLeft: 18, color: '#6b7280', fontSize: 13 }}
          >
            <li style={{ listStyle: 'disc' }}>
              <span style={{ color: hasMinLength ? 'green' : 'inherit' }}>
                {hasMinLength ? '✔' : '•'} At least 6 characters
              </span>
            </li>
            <li style={{ listStyle: 'disc' }}>
              <span style={{ color: hasUpper ? 'green' : 'inherit' }}>
                {hasUpper ? '✔' : '•'} Includes an uppercase letter (A–Z)
              </span>
            </li>
            <li style={{ listStyle: 'disc' }}>
              <span style={{ color: hasLower ? 'green' : 'inherit' }}>
                {hasLower ? '✔' : '•'} Includes a lowercase letter (a–z)
              </span>
            </li>
            <li style={{ listStyle: 'disc' }}>
              <span style={{ color: hasDigit ? 'green' : 'inherit' }}>
                {hasDigit ? '✔' : '•'} Includes a number (0–9)
              </span>
            </li>
            <li style={{ listStyle: 'disc' }}>
              <span style={{ color: hasSymbol ? 'green' : 'inherit' }}>
                {hasSymbol ? '✔' : '•'} Includes a symbol (e.g. ! @ # ?)
              </span>
            </li>
          </ul>

          <div className={styles.fieldGap} />

          <Field label="Confirm password">
            <Input
              value={confirm}
              onChange={(e) => setConfirm((e.target as HTMLInputElement).value)}
              type={showPw ? 'text' : 'password'}
              appearance="outline"
              aria-describedby="confirm-hint"
              contentBefore={confirm ? '🔒' : undefined}
              className={styles.input}
              required
              minLength={6}
            />
          </Field>
          <div
            id="confirm-hint"
            aria-live="polite"
            className={styles.hint}
            style={{ color: confirm.length > 0 && !confirmMatches ? 'crimson' as const : '#6b7280' }}
          >
            {confirm.length > 0 ? (confirmMatches ? '✔ Passwords match' : 'Passwords do not match') : ''}
          </div>

          <div style={{ height: 16 }} />

          <Button
            appearance="primary"
            type="submit"
            disabled={!canSubmit}
            className={`${styles.fullWidth} ${styles.ctaBtn}`}
          >
            {pending ? 'Creating…' : 'Register'}
          </Button>
        </form>
        <div className={styles.footer}>
          Already have an account? <a className={styles.link} href="/login">Sign in</a>
        </div>
      </div>
    </section>
  );
}
