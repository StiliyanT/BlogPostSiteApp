import { useEffect, useMemo, useState } from 'react';
import { makeStyles, Input, Button, Select, Option } from '@fluentui/react-components';

export type Filters = {
  query: string;
  author?: string | null | undefined;
  category?: string | null | undefined;
  sort?: 'newest' | 'views' | 'likes' | 'alpha';
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
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    setQuery(value?.query ?? '');
    setAuthor(value?.author ?? null);
  setCategory(value?.category ?? null);
    setSort(value?.sort ?? 'newest');
  }, [value]);

  useEffect(() => {
    onChange?.({ query: query.trim(), author: author || undefined, category: category || undefined, sort });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, author, category, sort]);

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
          onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
          appearance="outline"
        />

        <div className={styles.compactToggle}>
          <Button appearance="transparent" onClick={() => setExpanded((s) => !s)}>
            {expanded ? 'Hide' : 'Filters'}
          </Button>
        </div>

        <div className={styles.controls} style={{ display: expanded ? 'flex' : undefined }}>
          {/* desktop controls; on mobile these are shown when expanded */}
          <div style={{ minWidth: 160 }}>
            <Select
              value={author ?? ''}
              onChange={(e) => setAuthor((e.target as HTMLSelectElement).value || null)}
              appearance="outline"
            >
              <Option value="">All authors</Option>
              {authorOptions.map((a) => (
                <Option key={a} value={a}>{a}</Option>
              ))}
            </Select>
          </div>

          <div style={{ minWidth: 160 }}>
            <Select
              value={category ?? ''}
              onChange={(e) => setCategory((e.target as HTMLSelectElement).value || null)}
              appearance="outline"
            >
              <Option value="">All categories</Option>
              {categoryOptions.map((c) => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Select>
          </div>

          <div style={{ minWidth: 160 }}>
            <Select value={sort} onChange={(e) => setSort((e.target as any).value)} appearance="outline">
              <Option value="newest">Newest</Option>
              <Option value="views">Most viewed</Option>
              <Option value="likes">Most liked</Option>
              <Option value="alpha">A → Z</Option>
            </Select>
          </div>

          <div>
            <Button onClick={() => { setQuery(''); setAuthor(null); setSort('newest'); }} appearance="outline">Clear</Button>
          </div>
        </div>
      </div>

      {/* mobile: show panel when expanded */}
      {expanded && (
        <div className={styles.panel}>
          <Select
            value={author ?? ''}
            onChange={(e) => setAuthor((e.target as HTMLSelectElement).value || null)}
            appearance="outline"
          >
            <Option value="">All authors</Option>
            {authorOptions.map((a) => (
              <Option key={a} value={a}>{a}</Option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort((e.target as any).value)} appearance="outline">
            <Option value="newest">Newest</Option>
            <Option value="views">Most viewed</Option>
            <Option value="likes">Most liked</Option>
            <Option value="alpha">A → Z</Option>
          </Select>
          <Button onClick={() => { setQuery(''); setAuthor(null); setSort('newest'); setExpanded(false); }} appearance="outline">Clear</Button>
        </div>
      )}
    </div>
  );
}
