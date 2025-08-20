import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useMemo, useState } from 'react';
import { type BlogPostListItem, deletePost, getPosts, publishPost, uploadPostZip } from '../lib/apis';
import { Toaster, useToastController, Toast, ToastTitle, makeStyles, shorthands, tokens, Button, Input, Field, Dropdown, Option } from '@fluentui/react-components';

const useStyles = makeStyles({
  main: {
    width: '100%',
    maxWidth: '1100px',
  // Offset for fixed navbar: uses --app-nav-height when present, falls back to 64px
  margin: '0 auto 32px',
  ...shorthands.padding('calc(var(--app-nav-height, 64px) + 12px)', '16px'),
    boxSizing: 'border-box',
  },
  headerWrap: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(8px)',
    ...shorthands.border('1px', 'solid', 'rgba(229,231,235,0.8)'),
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    ...shorthands.borderRadius('16px'),
    ...shorthands.padding('16px', '20px'),
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(23,23,23,0.75)',
      ...shorthands.border('1px', 'solid', 'rgba(64,64,64,0.85)'),
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
    },
  },
  heading: { marginTop: 0, marginBottom: '4px' },
  accent: { width: '48px', height: '4px', backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)', borderRadius: '999px', marginBottom: '12px' },
  subtext: { marginTop: 0, marginBottom: '12px', color: tokens.colorNeutralForeground2 },
  actionRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', ...shorthands.gap('10px') },
  filterRow: { display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', ...shorthands.gap('12px'), marginTop: '12px' },
  // Card for sections
  card: {
    marginTop: '16px',
    backgroundColor: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(8px)',
    ...shorthands.border('1px', 'solid', 'rgba(229,231,235,0.8)'),
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    ...shorthands.borderRadius('16px'),
    ...shorthands.padding('16px', '20px'),
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(23,23,23,0.75)',
      ...shorthands.border('1px', 'solid', 'rgba(64,64,64,0.85)'),
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
    },
  },
  form: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', ...shorthands.gap('10px') },
  error: { color: 'crimson', marginTop: '8px' },
  input: {
    backgroundColor: '#ffffff',
    ...shorthands.border('1px', 'solid', '#cbd5e1'),
    ...shorthands.borderRadius('8px'),
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: '160ms',
    '@media (prefers-color-scheme: dark)': { backgroundColor: '#171717', ...shorthands.border('1px', 'solid', '#404040') },
    selectors: {
      '&:where(:hover)': { ...shorthands.borderColor('#94a3b8') },
      '&:where(:focus-within)': { ...shorthands.borderColor('#3b82f6'), outline: '2px solid #93c5fd', outlineOffset: '2px', boxShadow: '0 0 0 4px rgba(59,130,246,0.20)' },
      '&:where(:disabled)': { ...shorthands.borderColor('#e5e7eb'), backgroundColor: '#f9fafb' },
    },
  },
  // Dedicated dropdown styles so the popup list isn't transparent on glass cards
  dropdown: {
    backgroundColor: '#ffffff',
    ...shorthands.border('1px', 'solid', '#cbd5e1'),
    ...shorthands.borderRadius('8px'),
    '@media (prefers-color-scheme: dark)': { backgroundColor: '#171717', ...shorthands.border('1px', 'solid', '#404040') },
    selectors: {
      '&:where(:hover)': { ...shorthands.borderColor('#94a3b8') },
      '&:where(:focus-within)': { ...shorthands.borderColor('#3b82f6'), outline: '2px solid #93c5fd', outlineOffset: '2px', boxShadow: '0 0 0 4px rgba(59,130,246,0.20)' },
    },
  },
  dropdownListbox: {
    backgroundColor: '#ffffff',
    ...shorthands.border('1px', 'solid', 'rgba(229,231,235,0.9)'),
    ...shorthands.borderRadius('10px'),
    boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#171717',
      ...shorthands.border('1px', 'solid', 'rgba(64,64,64,0.85)'),
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
    },
    selectors: {
      '& .fui-Option[aria-selected="true"]': { backgroundColor: 'rgba(99,102,241,0.12)' },
      '& .fui-Option:where(:hover)': { backgroundColor: 'rgba(156,163,175,0.12)' },
      '@media (prefers-color-scheme: dark)': {
        '& .fui-Option[aria-selected="true"]': { backgroundColor: 'rgba(99,102,241,0.22)' },
        '& .fui-Option:where(:hover)': { backgroundColor: 'rgba(156,163,175,0.18)' },
      },
    },
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
    selectors: { '&:hover': { backgroundColor: 'rgba(156,163,175,0.08)' }, '&:focus-visible': { outline: '2px solid #93c5fd', outlineOffset: '2px' } },
  },
  tableWrap: { marginTop: '10px', overflow: 'auto', ...shorthands.borderRadius('12px'), ...shorthands.border('1px', 'solid', 'rgba(229,231,235,0.8)'), boxShadow: '0 6px 18px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: { textAlign: 'left', padding: '10px 12px', background: 'rgba(99,102,241,0.08)', color: tokens.colorNeutralForeground2 },
  td: { padding: '10px 12px', ...shorthands.borderTop('1px', 'solid', 'rgba(229,231,235,0.8)') },
  actionsCell: { textAlign: 'right', whiteSpace: 'nowrap' },
  pager: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' },
  subtle: { color: tokens.colorNeutralForeground2 },
});

export default function Admin() {
  const { roles, token, logout } = useAuth();
  const isAdmin = roles.includes('Admin');
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const [items, setItems] = useState<BlogPostListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState('');
  // Filters & paging
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const { dispatchToast } = useToastController('admin-toaster');
  const styles = useStyles();

  useEffect(() => {
    getPosts().then(setItems).catch(e => setError(String(e?.message || e)));
  }, []);

  const refresh = async () => {
    const list = await getPosts();
    setItems(list);
  };

  // Derived filtered & paged data
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(p => {
      const okQuery = !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      const okStatus = status === 'all' || (status === 'draft' ? (p.status ?? 0) === 0 : (p.status ?? 0) === 1);
      return okQuery && okStatus;
    });
  }, [items, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Reset/clamp page when inputs change
  useEffect(() => { setPage(1); }, [query, status, pageSize]);
  useEffect(() => { if (page !== currentPage) setPage(currentPage); }, [currentPage]);

  const onPublish = async (id: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await publishPost(id, token);
      await refresh();
  dispatchToast(<Toast><ToastTitle>Post published</ToastTitle></Toast>, { intent: 'success' });
    } catch (e) {
      setError(String((e as any)?.message || e));
  dispatchToast(<Toast><ToastTitle>Publish failed</ToastTitle></Toast>, { intent: 'error' });
    } finally { setBusy(false); }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Delete this post?')) return;
    setBusy(true);
    try {
      await deletePost(id, token);
      await refresh();
  dispatchToast(<Toast><ToastTitle>Post deleted</ToastTitle></Toast>, { intent: 'success' });
    } catch (e) {
      setError(String((e as any)?.message || e));
  dispatchToast(<Toast><ToastTitle>Delete failed</ToastTitle></Toast>, { intent: 'error' });
    } finally { setBusy(false); }
  };

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadPostZip({ file, slug: slug || undefined, token });
      setFile(null); setSlug('');
      await refresh();
  dispatchToast(<Toast><ToastTitle>Upload complete</ToastTitle></Toast>, { intent: 'success' });
    } catch (e) {
      setError(String((e as any)?.message || e));
  dispatchToast(<Toast><ToastTitle>Upload failed</ToastTitle></Toast>, { intent: 'error' });
    } finally { setBusy(false); }
  };

  return (
    <main className={styles.main}>
      <Toaster toasterId="admin-toaster" />
      <div className={styles.headerWrap}>
        <div className={styles.accent} />
        <h2 className={styles.heading}>Admin Dashboard</h2>
        <p className={styles.subtext}>Only users with the Admin role can view this page.</p>
        <div className={styles.actionRow}>
          <Button className={styles.outlineBtn} onClick={logout}>Logout</Button>
          <Button className={styles.outlineBtn} onClick={refresh} disabled={busy}>Refresh</Button>
        </div>
      </div>

      <section className={styles.card}>
        <h3>Upload new post (.zip)</h3>
        <form onSubmit={onUpload} className={styles.form}>
          <input type="file" accept=".zip" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <Field label="Optional slug">
            <Input value={slug} onChange={e => setSlug((e.target as HTMLInputElement).value)} placeholder="my-awesome-post" className={styles.input} />
          </Field>
          <Button type="submit" className={styles.ctaBtn} disabled={!file || busy}>Upload</Button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </section>

      <section className={styles.card}>
        <h3>Blog Posts</h3>
        <div className={styles.filterRow}>
          <Field label="Search">
            <Input value={query} onChange={e => setQuery((e.target as HTMLInputElement).value)} placeholder="Search title or slug" className={styles.input} />
          </Field>
          <Field label="Status">
            <Dropdown
              selectedOptions={[status]}
              onOptionSelect={(_, data) => setStatus((data.optionValue as 'all' | 'draft' | 'published') ?? 'all')}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value="all">All</Option>
              <Option value="draft">Draft</Option>
              <Option value="published">Published</Option>
            </Dropdown>
          </Field>
          <Field label="Page size">
            <Dropdown
              selectedOptions={[String(pageSize)]}
              onOptionSelect={(_, data) => setPageSize(Number(data.optionValue ?? 10))}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value="5">5</Option>
              <Option value="10">10</Option>
              <Option value="20">20</Option>
              <Option value="50">50</Option>
            </Dropdown>
          </Field>
          <div style={{ marginLeft: 'auto' }} className={styles.subtle}>
            {filtered.length > 0 ? (
              <span>
                Showing {(currentPage - 1) * pageSize + 1}
                –{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
              </span>
            ) : (
              <span>0 results</span>
            )}
          </div>
        </div>
        {!items ? (
          <p>Loading…</p>
        ) : filtered.length === 0 ? (
          <p>No posts.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Title</th>
                  <th className={styles.th}>Slug</th>
                  <th className={styles.th}>Created</th>
                  <th className={styles.th}>Likes</th>
                  <th className={styles.th}>Views</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(p => (
                  <tr key={p.id}>
                    <td className={styles.td}>{p.title}</td>
                    <td className={styles.td}>{p.slug}</td>
                    <td className={styles.td}>{new Date(p.createdOn).toLocaleDateString()}</td>
                    <td className={styles.td}>{p.likes ?? 0}</td>
                    <td className={styles.td}>{p.views ?? 0}</td>
                    <td className={`${styles.td} ${styles.actionsCell}`}>
                      <Button className={styles.outlineBtn} onClick={() => onPublish(p.id)} disabled={busy || p.status === 1}>Publish</Button>{' '}
                      <Button className={styles.outlineBtn} onClick={() => onDelete(p.id)} disabled={busy}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className={styles.pager}>
            <div className={styles.subtle}>Page {currentPage} of {pageCount}</div>
            <div>
              <Button className={styles.outlineBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>{' '}
              <Button className={styles.outlineBtn} onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}>Next</Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
