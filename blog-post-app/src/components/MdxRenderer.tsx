import { useEffect, useState } from 'react';
import { MDXProvider, useMDXComponents } from '@mdx-js/react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
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
  const mdxComponents = useMDXComponents(baseComponents(slug));

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
          // Let MDX read components from <MDXProvider>
          useMDXComponents,
          // Plugins
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug],
        });
        if (!cancelled) setContent(() => (mod as any).default);
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

  return (
    <MDXProvider components={mdxComponents}>
      <Content />
    </MDXProvider>
  );
}
