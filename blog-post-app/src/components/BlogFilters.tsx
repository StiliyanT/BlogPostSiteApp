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
  controls: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
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
  },
  selectContainer: {
  minWidth: '160px',
  width: '220px',
    '@media (max-width: 640px)': {
      width: '100%',
      minWidth: 'auto',
    },
  },
  // Dropdown styles mimic Admin panel to ensure listbox background and shadows are visible on glass cards
  dropdown: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    '@media (prefers-color-scheme: dark)': { backgroundColor: '#171717', border: '1px solid #404040' },
    selectors: {
      '&:where(:hover)': { ...shorthands.borderColor('#94a3b8') },
      '&:where(:focus-within)': { ...shorthands.borderColor('#3b82f6'), outline: '2px solid #93c5fd', outlineOffset: '2px', boxShadow: '0 0 0 4px rgba(59,130,246,0.20)' },
    },
  },
  dropdownListbox: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(229,231,235,0.9)',
    borderRadius: '10px',
    boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
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
  const [author, setAuthor] = useState<string | null>(value?.author ?? null);
  const [category, setCategory] = useState<string | null>(value?.category ?? null);
  const [sort, setSort] = useState<Filters['sort']>(value?.sort ?? 'newest');
  const [sortDir, setSortDir] = useState<Filters['sortDir']>(value?.sortDir ?? 'desc');
  const [liked, setLiked] = useState<boolean>(value?.liked ?? false);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    setQuery(value?.query ?? '');
    setAuthor(value?.author ?? null);
    setCategory(value?.category ?? null);
    setLiked(value?.liked ?? false);
    setSort(value?.sort ?? 'newest');
  }, [value]);

  useEffect(() => {
    onChange?.({ query: query.trim(), author: author || undefined, category: category || undefined, liked, sort, sortDir });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, author, category, sort, sortDir]);

  useEffect(() => {
    // ensure onChange runs when liked toggles
  onChange?.({ query: query.trim(), author: author || undefined, category: category || undefined, liked, sort, sortDir });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liked]);

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

  return (
    <div className={styles.root} aria-label="Blog filters">
      <div className={styles.row}>
        <Input
          className={styles.search}
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

        <div className={styles.controls} style={{ display: expanded ? 'flex' : undefined }}>
          {/* desktop controls; on mobile these are shown when expanded */}
          <div className={styles.selectContainer}>
            <Dropdown
              selectedOptions={author ? [author] : ['']}
              onOptionSelect={(_e, data) => setAuthor(String(data.optionValue ?? null))}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value="">All authors</Option>
              {authorOptions.map((a) => (
                <Option key={a} value={a}>{a}</Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.selectContainer}>
            <Dropdown
              selectedOptions={category ? [category] : ['']}
              onOptionSelect={(_e, data) => setCategory(String(data.optionValue ?? null))}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value="">All categories</Option>
              {categoryOptions.map((c) => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.selectContainer}>
            <Dropdown
              selectedOptions={[String(sort)]}
              onOptionSelect={(_e, data) => setSort(String(data.optionValue ?? 'newest') as any)}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value="newest">Newest</Option>
              <Option value="views">Most viewed</Option>
              <Option value="likes">Most liked</Option>
              <Option value="alpha">A → Z</Option>
            </Dropdown>
          </div>

          <div style={{ width: 96 }}>
            <Dropdown
              selectedOptions={[String(sortDir)]}
              onOptionSelect={(_e, data) => setSortDir(String(data.optionValue ?? 'desc') as any)}
              className={styles.dropdown}
              listbox={{ className: styles.dropdownListbox }}
            >
              <Option value="desc">Desc</Option>
              <Option value="asc">Asc</Option>
            </Dropdown>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Checkbox label="Liked" checked={liked} onChange={() => setLiked((s) => !s)} />
          </div>

          <div>
            <Button onClick={() => { setQuery(''); setAuthor(null); setSort('newest'); setSortDir('desc'); }} appearance="outline">Clear</Button>
          </div>
        </div>
      </div>

      {/* mobile: show panel when expanded */}
      {expanded && (
        <div className={styles.panel}>
          <Dropdown
            selectedOptions={author ? [author] : ['']}
            onOptionSelect={(_e, data) => setAuthor(String(data.optionValue ?? null))}
            className={styles.dropdown}
            listbox={{ className: styles.dropdownListbox }}
          >
            <Option value="">All authors</Option>
            {authorOptions.map((a) => (
              <Option key={a} value={a}>{a}</Option>
            ))}
          </Dropdown>
          <Dropdown
            selectedOptions={[String(sort)]}
            onOptionSelect={(_e, data) => setSort(String(data.optionValue ?? 'newest') as any)}
            className={styles.dropdown}
            listbox={{ className: styles.dropdownListbox }}
          >
            <Option value="newest">Newest</Option>
            <Option value="views">Most viewed</Option>
            <Option value="likes">Most liked</Option>
            <Option value="alpha">A → Z</Option>
          </Dropdown>
          <Dropdown
            selectedOptions={[String(sortDir)]}
            onOptionSelect={(_e, data) => setSortDir(String(data.optionValue ?? 'desc') as any)}
            className={styles.dropdown}
            listbox={{ className: styles.dropdownListbox }}
          >
            <Option value="desc">Desc</Option>
            <Option value="asc">Asc</Option>
          </Dropdown>
          <Checkbox label="Liked" checked={liked} onChange={() => setLiked((s) => !s)} />
          <Button onClick={() => { setQuery(''); setAuthor(null); setSort('newest'); setExpanded(false); }} appearance="outline">Clear</Button>
        </div>
      )}
    </div>
  );
}
