import { makeStyles, Toaster } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import HeroSection from "./components/HeroSection";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ConfirmAccount from "./pages/ConfirmAccount";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Blogs from "./pages/Blogs";
import Contact from "./pages/Contact";
import SpotlightCard from "./components/SpotlightCard";
import BlogList from "./components/BlogList";
import BlogPost from "./components/BlogPost";
import Carousel from "./components/Carousel";
import { getPosts, getPostBySlug, type BlogPostListItem, trackClickView } from "./lib/apis";
import { toAbsolute } from "./lib/urls";

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    color: "#1a1a1a",
    // dark mode support (optional, can be improved with context)
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: "#171717",
      color: "#fff",
    },
    display: "flex",
    flexDirection: "column",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  homeContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
    width: "100%",
  },
  spotlightSection: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1rem 0 1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  spotlightTitle: {
    fontSize: "2.25rem",
    fontWeight: 600,
    color: "#231f20",
    marginBottom: "2rem",
    '@media (prefers-color-scheme: dark)': {
      color: "#fff",
    },
  },
  spotlightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "2rem",
    width: "100%",
  },
  divider: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
    margin: "2rem 0",
  },
  dividerLine: {
    width: "100%",
    maxWidth: "32rem", // 512px
    borderTop: "1px solid #bfdbfe", // blue-200
    '@media (prefers-color-scheme: dark)': {
      borderTop: "1px solid #404040", // neutral-700
    },
  },
});

function App() {
  const styles = useStyles();
  type SpotlightItem = {
    slug: string;
    title: string;
    author?: string;
    image?: string;
    views?: number;
    likes?: number;
    createdOn?: string;
  };

  const [spotlightItems, setSpotlightItems] = useState<SpotlightItem[]>([]);
  const [spotlightError, setSpotlightError] = useState<string | null>(null);
  const [spotlightLoading, setSpotlightLoading] = useState<boolean>(false);
  // Responsive carousel: show 1 item on small screens, 3 on larger
  const [carouselItemsToShow, setCarouselItemsToShow] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(max-width: 640px)').matches ? 1 : 3;
      }
    } catch {
      // ignore
    }
    return 3;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (ev: MediaQueryListEvent | MediaQueryList) => {
      try {
        // some older browsers pass MediaQueryList instead of event
        const matches = 'matches' in ev ? ev.matches : mq.matches;
        setCarouselItemsToShow(matches ? 1 : 3);
      } catch {
        // ignore
      }
    };
    // initial
    onChange(mq as any);
    if ((mq as any).addEventListener) (mq as any).addEventListener('change', onChange);
    else (mq as any).addListener(onChange);
    return () => {
      if ((mq as any).removeEventListener) (mq as any).removeEventListener('change', onChange);
      else (mq as any).removeListener(onChange);
    };
  }, []);

  function normalizeHeroUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    const s = String(url);
    if (/^(https?:)?\/\//i.test(s) || s.startsWith('data:')) return s;
    return toAbsolute(s);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSpotlightLoading(true);
        setSpotlightError(null);
        const list = await getPosts();
        // newest first by createdOn
        const newest = [...list]
          .sort((a: BlogPostListItem, b: BlogPostListItem) => +new Date(b.createdOn) - +new Date(a.createdOn))
          .slice(0, 6);
        const detailed = await Promise.all(
          newest.map(async (p): Promise<SpotlightItem> => {
            try {
              const detail = await getPostBySlug(p.slug);
              return {
                slug: p.slug,
                title: p.title,
                image: normalizeHeroUrl((detail as any).heroUrl ?? (detail as any).heroImageUrl),
                // normalize author to a display string (API may return object or string)
                author: (detail as any).author?.name ?? (typeof (detail as any).author === 'string' ? (detail as any).author : 'Unknown'),
                views: (detail as any).views ?? 0,
                likes: (detail as any).likes ?? 0,
                createdOn: p.createdOn,
              };
            } catch {
              return { slug: p.slug, title: p.title, createdOn: p.createdOn };
            }
          })
        );
        if (!cancelled) setSpotlightItems(detailed);
      } catch (e: any) {
        if (!cancelled) setSpotlightError(e?.message || 'Failed to load spotlight');
      } finally {
        if (!cancelled) setSpotlightLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.root}>
      <NavBar />
  {/* Global toaster so notifications survive route changes */}
  <Toaster toasterId="app-toaster" />
      <main className={styles.main}>
        <Routes>
          <Route
            path="/"
            element={
              <div className={styles.homeContainer}>
                <HeroSection />
                <div className={styles.divider}>
                  <div className={styles.dividerLine} />
                </div>
                <section className={styles.spotlightSection}>
                  <h2 className={styles.spotlightTitle}>Spotlight</h2>
                  {spotlightError && !spotlightLoading && <div>Failed to load spotlight: {spotlightError}</div>}
                  {!spotlightError && spotlightItems.length > 0 && (
                    <Carousel itemsToShow={carouselItemsToShow} initialIndex={0}>
            {spotlightItems.map((post, idx) => (
                        <SpotlightCard
                          key={post.slug}
                          name={post.title || "Untitled"}
                          image={typeof post.image === 'string' ? post.image : "/placeholder.jpg"}
                          author={post.author || "Unknown"}
                          views={typeof post.views === 'number' ? post.views : 0}
                          likes={typeof post.likes === 'number' ? post.likes : 0}
                          createdOn={post.createdOn}
                          to={`/blog/${post.slug}`}
              isNew={idx === 0}
              onClick={() => trackClickView(post.slug)}
                        />
                      ))}
                    </Carousel>
                  )}
                </section>
              </div>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirm" element={<ConfirmAccount />} />
          <Route path="/admin" element={<Admin />} />
          {/* Add more routes as needed */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
