import { useEffect, useMemo, useRef, useState } from "react";
import { makeStyles, Toaster, useToastController, Toast, ToastTitle, Field, Input, Textarea, Button, shorthands } from "@fluentui/react-components";
import { sendContactMessage } from "../lib/apis";

const useStyles = makeStyles({
  root: {
    width: "100vw",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f3f4f6 0%, #e0e7ef 100%)",
    '@media (prefers-color-scheme: dark)': {
      background: "linear-gradient(135deg, #171717 0%, #262626 100%)",
    },
  },
  card: {
    width: 'min(1040px, 95vw)',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    color: '#111827',
    '@media (prefers-color-scheme: dark)': {
      background: '#1f2937',
      color: '#f3f4f6',
    },
  },
  title: {
    fontSize: "2rem",
    fontWeight: 600,
    marginBottom: "0.25rem",
  },
  subtitle: {
    marginBottom: '1rem',
    color: '#374151',
    '@media (prefers-color-scheme: dark)': { color: '#d1d5db' }
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1.25rem',
    '@media (min-width: 960px)': {
      gridTemplateColumns: '2fr 1fr',
      alignItems: 'start',
    },
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.75rem',
    '@media (min-width: 720px)': {
      gridTemplateColumns: '1fr 1fr',
    }
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '0.5rem',
    gap: '0.5rem',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    ...shorthands.padding('10px', '16px'),
    borderRadius: '8px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
    transition: 'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
    selectors: {
      '&:hover': { backgroundColor: '#1d4ed8', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' },
      '&:active': { backgroundColor: '#1e40af', transform: 'translateY(0)', boxShadow: '0 2px 8px rgba(0,0,0,0.20)' },
      '&:focus-visible': { outline: 'none', boxShadow: '0 0 0 2px rgba(255,255,255,0.65), 0 0 0 4px rgba(37,99,235,0.55)' as any },
      '&[disabled]': { opacity: 0.8, cursor: 'not-allowed' },
    },
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#3b82f6',
      selectors: {
        '&:hover': { backgroundColor: '#2563eb' },
        '&:active': { backgroundColor: '#1d4ed8' },
      },
    },
  },
  validationMsg: {
    color: '#ef4444',
    fontSize: '12px',
    lineHeight: '16px',
    minHeight: '16px',
    marginTop: '4px',
    whiteSpace: 'pre-wrap',
  },
  inputBase: {
    ...shorthands.border('1px', 'solid', '#e5e7eb'),
    borderRadius: '8px',
    backgroundColor: 'transparent',
    selectors: {
  '&:hover': { ...shorthands.border('1px', 'solid', '#e5e7eb'), boxShadow: 'none' as any },
  '&:focus-within': { ...shorthands.border('1px', 'solid', '#93c5fd'), boxShadow: '0 0 0 2px rgba(147,197,253,0.25)' as any },
    },
    '@media (prefers-color-scheme: dark)': {
  ...shorthands.borderColor('#ffffff'),
  selectors: { '&:hover': { ...shorthands.border('1px', 'solid', '#ffffff'), boxShadow: 'none' as any } },
    },
  },
  textareaBase: {
    backgroundColor: 'transparent',
  },
  inputInner: {
    paddingInlineStart: '14px',
    paddingInlineEnd: '12px',
  },
  textareaInner: {
    padding: '10px 12px',
    ...shorthands.border('1px', 'solid', '#e5e7eb'),
    borderRadius: '8px',
    backgroundColor: 'transparent',
    selectors: {
      '&:hover': { ...shorthands.border('1px', 'solid', '#e5e7eb') },
      '&:focus': { ...shorthands.border('1px', 'solid', '#93c5fd'), outline: 'none', boxShadow: '0 0 0 2px rgba(147,197,253,0.25)' as any },
      '&:focus-visible': { ...shorthands.border('1px', 'solid', '#93c5fd'), outline: 'none', boxShadow: '0 0 0 2px rgba(147,197,253,0.25)' as any },
    },
    '@media (prefers-color-scheme: dark)': {
      ...shorthands.borderColor('#ffffff'),
      selectors: {
        '&:hover': { ...shorthands.border('1px', 'solid', '#ffffff') },
        '&:focus': { ...shorthands.border('1px', 'solid', '#ffffff'), outline: 'none', boxShadow: '0 0 0 2px rgba(255,255,255,0.25)' as any },
        '&:focus-visible': { ...shorthands.border('1px', 'solid', '#ffffff'), outline: 'none', boxShadow: '0 0 0 2px rgba(255,255,255,0.25)' as any },
      },
    },
  },
  aside: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem',
    '@media (min-width: 960px)': {
      borderTop: 'none',
      borderLeft: '1px solid #e5e7eb',
      paddingLeft: '1rem',
      marginLeft: '0.25rem',
    },
    '@media (prefers-color-scheme: dark)': {
      ...shorthands.borderColor('#374151'),
    },
  },
  asideHeading: {
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 0.5rem 0',
  },
  asideList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: '0.5rem',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    '@media (prefers-color-scheme: dark)': { color: '#93c5fd' },
  },
});

export default function Contact() {
  const styles = useStyles();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  // Anti-abuse signals
  const [honeypot, setHoneypot] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const { dispatchToast } = useToastController('app-toaster');
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const [touched, setTouched] = useState<{name:boolean; email:boolean; subject:boolean; message:boolean}>({ name:false, email:false, subject:false, message:false });

  // Persist minimal draft locally to avoid loses on accidental nav
  useEffect(() => {
    const saved = localStorage.getItem('contact:draft');
    if (saved) {
      try {
        const v = JSON.parse(saved);
        if (v && typeof v === 'object') {
          if (v.name) setName(v.name);
          if (v.email) setEmail(v.email);
          if (v.subject) setSubject(v.subject);
          if (v.message) setMessage(v.message);
        }
      } catch {}
    }
  }, []);
  useEffect(() => {
    const draft = { name, email, subject, message };
    localStorage.setItem('contact:draft', JSON.stringify(draft));
  }, [name, email, subject, message]);

  const errors = useMemo(() => {
    const e: Partial<Record<'name'|'email'|'subject'|'message', string>> = {};
    if (!name.trim()) e.name = 'Your name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!subject.trim()) e.subject = 'Subject is required';
    if (!message.trim()) e.message = 'Message is required';
    return e;
  }, [name, email, subject, message]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate and focus first error
  const order: Array<'name'|'email'|'subject'|'message'> = ['name','email','subject','message'];
    const firstKey = order.find(k => (errors as any)[k]);
    if (firstKey) {
      const map: any = { name: nameRef, email: emailRef, subject: subjectRef, message: messageRef };
      map[firstKey]?.current?.focus();
  setTouched(prev => ({ ...prev, [firstKey]: true }));
      dispatchToast(
        <Toast><ToastTitle>{(errors as any)[firstKey]}</ToastTitle></Toast>,
        { intent: 'warning', timeout: 2200 }
      );
      return;
    }
    setPending(true);
    try {
      const elapsedMs = Date.now() - startedAt;
      await sendContactMessage({ name, email, subject, message, honeypot, elapsedMs });
      dispatchToast(
        <Toast><ToastTitle>Message sent. Thank you!</ToastTitle></Toast>,
        { intent: 'success', timeout: 3000 }
      );
  setName(""); setEmail(""); setSubject(""); setMessage(""); setHoneypot("");
  setTouched({ name: false, email: false, subject: false, message: false });
  setStartedAt(Date.now());
      localStorage.removeItem('contact:draft');
    } catch (e: any) {
      dispatchToast(
        <Toast><ToastTitle>{e?.message || 'Failed to send. Try again later.'}</ToastTitle></Toast>,
        { intent: 'error', timeout: 3500 }
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.root} style={{ paddingTop: 96, paddingBottom: 32 }}>
      <main className={styles.card}>
        {/* Local toaster optional; global toaster is in App */}
        <Toaster toasterId="contact-toaster" />
        <h1 className={styles.title}>Contact</h1>
        <p className={styles.subtitle}>Have a question, feedback, or collaboration idea? Send me a note and I’ll get back to you.</p>
        <div className={styles.content}>
          <form onSubmit={onSubmit} noValidate>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div className={styles.row}>
                <Field label="Name" validationState="none">
                  <Input className={styles.inputBase} input={{ className: styles.inputInner, maxLength: 120 }} appearance="outline" placeholder="Your name" ref={nameRef} value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} onBlur={() => setTouched(p => ({...p, name:true}))} required />
                  <div className={styles.validationMsg} aria-live="polite">{touched.name ? (errors.name || '') : ''}</div>
                </Field>
                <Field label="Email" validationState="none">
                  <Input className={styles.inputBase} input={{ className: styles.inputInner, maxLength: 254 }} appearance="outline" placeholder="you@example.com" ref={emailRef} type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} onBlur={() => setTouched(p => ({...p, email:true}))} required />
                  <div className={styles.validationMsg} aria-live="polite">{touched.email ? (errors.email || '') : ''}</div>
                </Field>
              </div>
              <Field label="Subject" validationState="none">
                <Input className={styles.inputBase} input={{ className: styles.inputInner, maxLength: 200 }} appearance="outline" placeholder="How can I help?" ref={subjectRef} value={subject} onChange={(e) => setSubject((e.target as HTMLInputElement).value)} onBlur={() => setTouched(p => ({...p, subject:true}))} required />
                <div className={styles.validationMsg} aria-live="polite">{touched.subject ? (errors.subject || '') : ''}</div>
              </Field>
              <Field label="Message" validationState="none">
                <Textarea className={styles.textareaBase} textarea={{ className: styles.textareaInner, maxLength: 5000 }} appearance="outline" placeholder="Write your message…" ref={messageRef} value={message} onChange={(e) => setMessage((e.target as HTMLTextAreaElement).value)} onBlur={() => setTouched(p => ({...p, message:true}))} rows={6} required />
                <div className={styles.validationMsg} aria-live="polite">{touched.message ? (errors.message || '') : ''}</div>
              </Field>
              {/* Honeypot field (hidden visually; helps catch simple bots) */}
              <div style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }} aria-hidden>
                <label>
                  Company
                  <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                </label>
              </div>
              <div className={styles.actions}>
                <Button className={styles.submitButton} type="submit" appearance="primary" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</Button>
              </div>
            </div>
          </form>
          <aside className={styles.aside}>
            <h3 className={styles.asideHeading}>Also reachable</h3>
            <ul className={styles.asideList}>
              <li><a className={styles.link} href="mailto:stiliyantopalov@gmail.com">stiliyantopalov@gmail.com</a></li>
              <li><a className={styles.link} href="https://linkedin.com/in/stiliyan" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a className={styles.link} href="https://instagram.com/stiliyan" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><a className={styles.link} href="https://twitter.com/stiliyan" target="_blank" rel="noopener noreferrer">Twitter / X</a></li>
              <li><a className={styles.link} href="https://github.com/stiliyan" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
