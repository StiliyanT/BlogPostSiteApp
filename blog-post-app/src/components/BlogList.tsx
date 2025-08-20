import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPosts, type BlogPostListItem } from '../lib/apis';

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPostListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPosts().then(setPosts).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;
  if (!posts) return <div style={{ padding: 24 }}>Loading…</div>;
  if (posts.length === 0) return <div style={{ padding: 24 }}>No posts yet.</div>;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Blog</h1>
      <ul style={{ display: 'grid', gap: 16, listStyle: 'none', padding: 0 }}>
        {posts.map(p => (
          <li key={p.id} style={{ border: '1px solid #eee', padding: 16, borderRadius: 12 }}>
            <h2 style={{ margin: '0 0 8px' }}>
              <Link to={`/blog/${p.slug}`}>{p.title}</Link>
            </h2>
            <p style={{ margin: 0, opacity: 0.8 }}>{p.summary}</p>
            <small style={{ display: 'block', marginTop: 8, opacity: 0.6 }}>
              {new Date(p.createdOn).toLocaleDateString()}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
