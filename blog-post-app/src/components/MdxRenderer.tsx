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

const baseComponents = (slug: string): Record<string, React.ComponentType<any>> => ({
  img: (p: any) => <MdxImage {...p} slug={slug} />,
  a: (p: any) => <MdxLink {...p} />,
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
      } catch (err) {
        if (!cancelled) setContent(() => () => <div>Error rendering content.</div>);
        // Optionally log error
        // console.error('MDX render error', err);
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

  // Key the rendered content by a short fingerprint of the MDX so React will remount the
  // evaluated component whenever the underlying MDX changes. This prevents hook mismatches
  // when the evaluated module's internal hook usage differs between renders.
  const contentKey = mdx ? `${mdx.length}:${mdx.slice(0, 16)}` : 'empty';

  return (
    <MDXProvider components={mdxComponents}>
      <ErrorBoundary>
        <div key={contentKey}>
          <Content />
        </div>
      </ErrorBoundary>
    </MDXProvider>
  );
}
