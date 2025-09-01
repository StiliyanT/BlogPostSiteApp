import { useEffect, useState, useMemo, useRef } from 'react';
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

// Simple ErrorBoundary moved out of the renderer to avoid redefining on each render
class MdxErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any, info: any) {
    // Log the error and component stack for debugging
    // eslint-disable-next-line no-console
    console.error('[MdxErrorBoundary] MDX render error', err, info?.componentStack);
  }
  render() {
    if (this.state.hasError) return React.createElement('div', null, 'Error rendering content.');
    return this.props.children as any;
  }
}

export default function MdxRenderer({ mdx, slug }: { mdx: string; slug: string }) {
  const [Content, setContent] = useState<React.ComponentType | null>(null);
  const mdxComponents = useMemo(() => baseComponents(slug), [slug]);

  // cancelled flag for async effect
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let disposed = false;

    const load = async () => {
      try {
        // Compile & evaluate MDX into a React component module
        const mod = await evaluate(mdx, {
          Fragment: runtime.Fragment,
          jsx: runtime.jsx,
          jsxs: runtime.jsxs,
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug],
        });

        if (disposed) return;

        // Normalize module default export into a proper React component
        const maybeComp = (mod as any).default;
        let Comp: React.ComponentType;
        if (typeof maybeComp === 'function') {
          Comp = maybeComp as React.ComponentType;
        } else if (React.isValidElement(maybeComp)) {
          Comp = () => maybeComp as any;
        } else {
          Comp = () => React.createElement('div', null, 'Invalid MDX content');
        }

        // Log module shape for diagnostics
        // eslint-disable-next-line no-console
        console.debug('[MdxRenderer] loaded MDX', { slug, isFunction: typeof maybeComp === 'function' });

        if (!cancelledRef.current) setContent(() => Comp);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[MdxRenderer] evaluate error', err);
        if (!cancelledRef.current) setContent(() => () => React.createElement('div', null, 'Error rendering content.'));
      }
    };

    load();

    return () => {
      disposed = true;
      cancelledRef.current = true;
      // clear Content so next load starts fresh
      setContent(null);
    };
  }, [mdx, slug]);

  if (!Content) return <div>Rendering…</div>;

  // Short fingerprint to force remount when mdx content changes
  const contentKey = useMemo(() => {
    const s = mdx || '';
    // simple djb2 hash to keep key short
    let h = 5381;
    for (let i = 0; i < Math.min(128, s.length); i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return `${Math.abs(h)}`;
  }, [mdx]);

  return (
    <MDXProvider components={mdxComponents}>
      <MdxErrorBoundary>
        <div key={contentKey}>
          <Content />
        </div>
      </MdxErrorBoundary>
    </MDXProvider>
  );
}
