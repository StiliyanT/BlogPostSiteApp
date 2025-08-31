import { useEffect, useMemo, useState } from 'react';
import { makeStyles, Input, Button, Dropdown, Option, Checkbox, shorthands } from '@fluentui/react-components';

export type Filters = {
  query: string;
  author?: string | null | undefined;
  category?: string | null | undefined;
  liked?: boolean;
  sort?: 'newest' | 'views' | 'likes' | 'alpha';
  sortDir?: 'asc' | 'desc';
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    width: '100%',
    marginBottom: '1.25rem',
    '@media (max-width: 640px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '0.5rem',
    },
  },
  row: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },
  search: {
    flex: 1,
  },
  // input style similar to Admin page for consistent look
  input: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '10px 12px',
    selectors: {
      '&:where(:hover)': { ...shorthands.borderColor('#94a3b8') },
      '&:where(:focus-within)': { ...shorthands.borderColor('#3b82f6'), outline: '2px solid #93c5fd', outlineOffset: '2px', boxShadow: '0 0 0 4px rgba(59,130,246,0.10)' },
    },
  },
  checkbox: {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: 'inherit',
  marginLeft: '6px',
  fontSize: '0.95rem',
  lineHeight: '1',
  whiteSpace: 'nowrap',
  flexWrap: 'nowrap',
  },
  controls: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    // subtle 'panel' look like admin
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: '6px',
    borderRadius: '10px',
    width: '100%',
    // hide desktop controls on small screens; mobile uses the panel when expanded
    '@media (max-width: 640px)': {
      display: 'none',
    },
  },
  controlsExpanded: {
    display: 'flex',
  },
  compactToggle: {
    display: 'none',
    '@media (max-width: 640px)': {
      display: 'inline-flex',
      marginLeft: 'auto',
    },
  },
  panel: {
    width: '100%',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    '@media (max-width: 640px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    // hide the mobile panel on larger screens
    '@media (min-width: 641px)': {
      display: 'none',
    },
  },
  selectContainer: {
    minWidth: '140px',
    width: '220px',
    paddingRight: '20px',
    display: 'flex',
    alignItems: 'center',
  position: 'relative',
    '@media (max-width: 640px)': {
      width: '100%',
      minWidth: 'auto',
      paddingRight: 0,
      flex: '1 1 auto',
    },
  },
  // overlay fallback removed — Dropdown `value` now supplies the visible label
  sortButtonContainer: {
    width: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonContent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  sortLabel: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1,
  },
  clearButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    minWidth: '40px',
    height: '36px',
  },
  clearIcon: {
    width: '16px',
    height: '16px',
  },
  // Dropdown styles mimic Admin panel to ensure listbox background and shadows are visible on glass cards
  dropdown: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
  padding: '8px 10px',
  minHeight: '40px',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  zIndex: 10,
    '@media (prefers-color-scheme: dark)': { backgroundColor: '#171717', border: '1px solid #404040' },
    selectors: {
      '&:where(:hover)': { ...shorthands.borderColor('#94a3b8') },
      '&:where(:focus-within)': { ...shorthands.borderColor('#3b82f6'), outline: '2px solid #93c5fd', outlineOffset: '2px', boxShadow: '0 0 0 4px rgba(59,130,246,0.20)' },
  '& .fui-Dropdown-toggle': { minHeight: '40px' },
  '@media (max-width: 640px)': { padding: '10px', minHeight: '44px' },
    },
  },
  dropdownListbox: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(229,231,235,0.9)',
    borderRadius: '10px',
    boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
  zIndex: 9999,
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#171717',
      border: '1px solid rgba(64,64,64,0.85)',
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
});

export default function BlogFilters(props: {
  authors?: string[];
  categories?: string[];
  value?: Filters;
  onChange?: (v: Filters) => void;
}) {
  const { authors = [], value, onChange } = props;
  const styles = useStyles();

  const [query, setQuery] = useState(value?.query ?? '');
  // internal sentinel values (non-empty) so the Dropdown toggle always shows a label
  const ALL_AUTHOR = 'ALL_AUTHORS';
  const ALL_CATEGORY = 'ALL_CATEGORIES';

  const [author, setAuthor] = useState<string>(value?.author ?? ALL_AUTHOR);
  const [category, setCategory] = useState<string>(value?.category ?? ALL_CATEGORY);
  const [sort, setSort] = useState<Filters['sort']>(value?.sort ?? 'newest');
  const [sortDir, setSortDir] = useState<Filters['sortDir']>(value?.sortDir ?? 'asc');
  const [liked, setLiked] = useState<boolean>(value?.liked ?? false);
  const [expanded, setExpanded] = useState<boolean>(false);

  // initialize internal state from value once on mount; keep dropdowns independent afterwards
  useEffect(() => {
    setQuery(value?.query ?? '');
  setAuthor(value?.author ?? ALL_AUTHOR);
  setCategory(value?.category ?? ALL_CATEGORY);
    setLiked(value?.liked ?? false);
    setSort(value?.sort ?? 'newest');
  setSortDir(value?.sortDir ?? 'asc');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // map sentinel values back to undefined so parent sees 'no filter'
    const emitAuthor = author && author !== ALL_AUTHOR ? author : undefined;
    const emitCategory = category && category !== ALL_CATEGORY ? category : undefined;
    onChange?.({ query: query.trim(), author: emitAuthor, category: emitCategory, liked, sort, sortDir });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, author, category, liked, sort, sortDir]);

  // when liked changes, the main effect (below) already emits the updated filters; no separate effect needed

  const authorOptions = useMemo(() => {
    const unique = Array.from(new Set(authors.filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [authors]);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set((props.categories ?? []).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [props.categories]);

  // ensure the selected author stays valid when the list of authors changes
  useEffect(() => {
    if (author && author !== ALL_AUTHOR && !authorOptions.includes(author)) {
      setAuthor(ALL_AUTHOR);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorOptions]);

  // ensure the selected category stays valid when the list of categories changes
  useEffect(() => {
    if (category && category !== ALL_CATEGORY && !categoryOptions.includes(category)) {
      setCategory(ALL_CATEGORY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryOptions]);

  return (
    <div className={styles.root} aria-label="Blog filters">
      <div className={styles.row}>
        <Input
          className={`${styles.search} ${styles.input}`}
          placeholder="Search posts by title, summary or author…"
          value={query}
          onChange={(_e, data) => setQuery(String(data?.value ?? ''))}
          appearance="outline"
        />

        <div className={styles.compactToggle}>
          <Button appearance="transparent" onClick={() => setExpanded((s) => !s)}>
            {expanded ? 'Hide' : 'Filters'}
          </Button>
        </div>

  <div className={`${styles.controls} ${expanded ? styles.controlsExpanded : ''}`}>
          {/* desktop controls; on mobile these are shown when expanded */}
          <div className={styles.selectContainer}>
            <Dropdown
              selectedOptions={[author ?? ALL_AUTHOR]}
              value={author === ALL_AUTHOR ? 'All authors' : (authorOptions.find(a => a === author) ?? author)}
              onOptionSelect={(_e, data) => setAuthor(String(data.optionValue ?? ALL_AUTHOR))}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value={ALL_AUTHOR}>All authors</Option>
              {authorOptions.map((a) => (
                <Option key={a} value={a}>{a}</Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.selectContainer}>
            <Dropdown
              selectedOptions={[category ?? ALL_CATEGORY]}
              value={category === ALL_CATEGORY ? 'All categories' : (categoryOptions.find(c => c === category) ?? category)}
              onOptionSelect={(_e, data) => setCategory(String(data.optionValue ?? ALL_CATEGORY))}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value={ALL_CATEGORY}>All categories</Option>
              {categoryOptions.map((c) => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.selectContainer}>
            <Dropdown
              selectedOptions={[String(sort ?? 'newest')]}
              value={
                sort === 'newest' ? 'Newest' : sort === 'views' ? 'Most viewed' : sort === 'likes' ? 'Most liked' : 'A → Z'
              }
              onOptionSelect={(_e, data) => setSort(String(data.optionValue ?? 'newest') as any)}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value="newest">Newest</Option>
              <Option value="views">Most viewed</Option>
              <Option value="likes">Most liked</Option>
              {/* A → Z is provided via the A - Z button; removed from Dropdown */}
            </Dropdown>
          </div>

          <div className={styles.sortButtonContainer}>
            <Button
              appearance="outline"
              onClick={() => { setSort('alpha'); setSortDir((s) => (s === 'asc' ? 'desc' : 'asc')); }}
              aria-label={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
              title={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
            >
                <span className={styles.sortButtonContent}>
                  {sortDir === 'asc' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M6 14L12 8L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M6 10L12 16L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
          <span className={styles.sortLabel}>A - Z</span>
        </span>
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Checkbox className={styles.checkbox} label="Liked by me" checked={liked} onChange={() => setLiked((s) => !s)} />
          </div>

          <div>
            <Button className={styles.clearButton} onClick={() => { setQuery(''); setAuthor(ALL_AUTHOR); setCategory(ALL_CATEGORY); setSort('newest'); setSortDir('asc'); }} appearance="outline" aria-label="Clear filters" title="Clear filters">
              <svg className={styles.clearIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* mobile: show panel when expanded */}
      {expanded && (
        <div className={styles.panel}>
          <Dropdown
            selectedOptions={[author]}
            value={author === ALL_AUTHOR ? 'All authors' : (authorOptions.find(a => a === author) ?? author)}
            onOptionSelect={(_e, data) => setAuthor(String(data.optionValue ?? ALL_AUTHOR))}
            className={styles.dropdown}
            listbox={{ className: styles.dropdownListbox }}
          >
            <Option value={ALL_AUTHOR}>All authors</Option>
            {authorOptions.map((a) => (
              <Option key={a} value={a}>{a}</Option>
            ))}
          </Dropdown>
          <Dropdown
            selectedOptions={[String(sort ?? 'newest')]}
            value={
              sort === 'newest' ? 'Newest' : sort === 'views' ? 'Most viewed' : sort === 'likes' ? 'Most liked' : 'A → Z'
            }
            onOptionSelect={(_e, data) => setSort(String(data.optionValue ?? 'newest') as any)}
            className={styles.dropdown}
            listbox={{ className: styles.dropdownListbox }}
          >
            <Option value="newest">Newest</Option>
            <Option value="views">Most viewed</Option>
            <Option value="likes">Most liked</Option>
            {/* A → Z is provided via the A - Z button; removed from Dropdown */}
          </Dropdown>
          <Button
            appearance="outline"
            onClick={() => setSortDir((s) => (s === 'asc' ? 'desc' : 'asc'))}
            aria-label={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
            title={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            <span className={styles.sortButtonContent}>
              {sortDir === 'asc' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 14L12 8L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 10L12 16L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className={styles.sortLabel}>{'A - Z'}</span>
            </span>
          </Button>
          <Checkbox className={styles.checkbox} label="Liked" checked={liked} onChange={() => setLiked((s) => !s)} />
          <Button className={styles.clearButton} onClick={() => { setQuery(''); setAuthor(ALL_AUTHOR); setCategory(ALL_CATEGORY); setSort('newest'); setExpanded(false); }} appearance="outline" aria-label="Clear filters" title="Clear filters">
            <svg className={styles.clearIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
