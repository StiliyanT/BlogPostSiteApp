import { useEffect, useState } from 'react';
import { MDXProvider } from '@mdx-js/react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import React from 'react';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { toAbsolute } from '../lib/urls';

function resolveAsset(src: string, slug: string) {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return toAbsolute(src);
  const cleaned = src.replace(/^\.?\//, '');
  return toAbsolute(`/static/posts/${slug}/${cleaned}`);
}

function MdxImage({ src = '', alt = '', slug = '', ...rest }: any) {
  const abs = resolveAsset(src, slug);
  return (
    <a href={abs} target="_blank" rel="noopener noreferrer">
      <img src={abs} alt={alt} loading="lazy" {...rest} style={{ cursor: 'zoom-in', maxWidth: '100%', height: 'auto' }} />
    </a>
  );
}

function MdxLink(props: any) {
  const isExternal = typeof props.href === 'string' && /^https?:\/\//.test(props.href);
  return <a {...props} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined} />;
}

function Callout({ type = 'info', children, ...rest }: any) {
  const bg = type === 'success' ? '#ecfdf5' : type === 'warning' ? '#fff7ed' : '#eff6ff';
  const border = type === 'success' ? '#10b981' : type === 'warning' ? '#f97316' : '#3b82f6';
  const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '💡';
  return (
    <div {...rest} style={{ background: bg, borderLeft: `4px solid ${border}`, padding: '12px 14px', borderRadius: 6, margin: '12px 0' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{icon} {String(type).toUpperCase()}</div>
      <div>{children}</div>
    </div>
  );
}

const baseComponents = (slug: string): Record<string, React.ComponentType<any>> => ({
  img: (p: any) => <MdxImage {...p} slug={slug} />,
  a: (p: any) => <MdxLink {...p} />,
  Callout: (p: any) => <Callout {...p} />,
});

export default function MdxRenderer({ mdx, slug }: { mdx: string; slug: string }) {
  const [Content, setContent] = useState<React.ComponentType | null>(null);
  const mdxComponents = baseComponents(slug);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Compile & evaluate MDX into a React component module
        const mod = await evaluate(mdx, {
          // Provide the JSX runtime for MDX to use
          Fragment: runtime.Fragment,
          jsx: runtime.jsx,
          jsxs: runtime.jsxs,
          // Let MDX read components from <MDXProvider> (we will provide components when rendering)
          // Plugins
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug],
        });

        // Normalize module default export into a proper React component
        const maybeComp = (mod as any).default;
        let Comp: React.ComponentType;
        if (typeof maybeComp === 'function') {
          Comp = maybeComp as React.ComponentType;
        } else if (React.isValidElement(maybeComp)) {
          // wrap as component that returns the element
          Comp = () => maybeComp as any;
        } else {
          // fallback: render JSON/string representation
          Comp = () => React.createElement('div', null, 'Invalid MDX content');
        }

        if (!cancelled) {
          // Debug: log the shape of the evaluated module/component for diagnostics
          try { console.debug('[MdxRenderer] evaluated MDX component', { slug, compType: typeof Comp }); } catch {}
          setContent(() => Comp);
        }
      } catch (err: any) {
        // Log the evaluation error and set a content component that shows details so it doesn't bubble up
        // eslint-disable-next-line no-console
        console.error('[MdxRenderer] MDX evaluation error', err);
        if (!cancelled) setContent(() => () => (
          React.createElement('div', { style: { color: 'red' } }, [
            React.createElement('h3', { key: 'h' }, 'Error rendering content.'),
            React.createElement('pre', { key: 'p', style: { whiteSpace: 'pre-wrap', fontSize: '0.9rem' } }, String(err?.message || err)),
          ])
        ));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mdx]);

  if (!Content) return <div>Rendering…</div>;

  // Error boundary to catch runtime errors during MDX rendering
  class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(err: any) {
      // eslint-disable-next-line no-console
      console.error('MDX runtime error', err);
    }
    render() {
      if (this.state.hasError) return React.createElement('div', null, 'Error rendering content.');
      return this.props.children as any;
    }
  }

  // Create dynamic fallback components for any capitalized JSX tags used in the MDX
  // (e.g., Callout, Note). This prevents the MDX runtime from throwing when a
  // custom component isn't provided.
  const dynamicNames = new Set<string>();
  try {
    const re = /<([A-Z][A-Za-z0-9_]*)\b/g;
    let m;
    while ((m = re.exec(mdx || '')) !== null) {
      dynamicNames.add(m[1]);
    }
  } catch {
    // ignore
  }

  const dynamicComponents: Record<string, React.ComponentType<any>> = {};
  dynamicNames.forEach((n) => {
    if (!(n in mdxComponents)) {
      dynamicComponents[n] = (props: any) => (
        React.createElement('div', { style: { borderLeft: '4px solid #cbd5e1', padding: '8px 12px', borderRadius: 6, margin: '8px 0' } }, [
          React.createElement('div', { key: 'hd', style: { fontWeight: 600, marginBottom: 6 } }, n),
          React.createElement('div', { key: 'bd' }, props.children),
        ])
      );
    }
  });

  const mergedComponents = { ...mdxComponents, ...dynamicComponents };

  // Key the rendered content by a short fingerprint of the MDX so React will remount the
  // evaluated component whenever the underlying MDX changes. This prevents hook mismatches
  // when the evaluated module's internal hook usage differs between renders.
  const contentKey = mdx ? `${mdx.length}:${mdx.slice(0, 16)}` : 'empty';

  return (
    <MDXProvider components={mergedComponents}>
      <ErrorBoundary>
        <div key={contentKey}>
          {/* Pass components explicitly to the evaluated MDX component — some MDX builds expect a `components` prop */}
          {React.createElement((Content as any), { components: mergedComponents })}
        </div>
      </ErrorBoundary>
    </MDXProvider>
  );
}
